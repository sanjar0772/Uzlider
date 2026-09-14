import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";
import { computePnl, CostSettings } from "@/lib/finance";

async function getSettings(): Promise<CostSettings> {
  let s = await prisma.companySettings.findFirst();
  if (!s) s = await prisma.companySettings.create({ data: { id: "company" } });
  return {
    mpg: s.mpg,
    fuelPricePerGallon: s.fuelPricePerGallon,
    fixedCostPerMile: s.fixedCostPerMile,
    targetRpm: s.targetRpm,
    factoringRatePct: s.factoringRatePct,
  };
}

// Deep analytics: driver scorecards, 12-month profit trend, expense mix,
// lane performance and true cost-per-mile (real expenses + fuel folded in).
// Query: ?months=6|12 window for the trend (default 12).
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.viewAnalytics(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const monthsWindow = Number(searchParams.get("months")) === 6 ? 6 : 12;

  const settings = await getSettings();
  const [loads, drivers, expenses, fuel] = await Promise.all([
    prisma.load.findMany({ include: { driver: true, truck: true, customer: true } }),
    prisma.driver.findMany(),
    prisma.expense.findMany(),
    prisma.fuelPurchase.findMany(),
  ]);

  const nonCancelled = loads.filter((l) => l.status !== "CANCELLED");
  const delivered = loads.filter((l) => l.status === "DELIVERED");

  // ---- Driver scorecards ----
  const dmap: Record<string, any> = {};
  for (const d of drivers) {
    dmap[d.id] = {
      id: d.id, name: d.name, status: d.status,
      loads: 0, delivered: 0, revenue: 0, profit: 0, miles: 0, deadMiles: 0,
      driverPay: 0, onTime: 0, onTimeEligible: 0, rpmSum: 0, rpmCount: 0,
    };
  }
  for (const l of loads) {
    if (!l.driverId || !dmap[l.driverId]) continue;
    const s = dmap[l.driverId];
    s.loads += 1;
    if (l.status === "CANCELLED") continue;
    const p = computePnl(l, settings, l.truck?.mpg ?? null);
    s.revenue += p.revenue;
    s.profit += p.netProfit;
    s.miles += l.miles ?? 0;
    s.deadMiles += l.deadheadMiles ?? 0;
    s.driverPay += p.driverPay;
    if (p.loadedRpm > 0) { s.rpmSum += p.loadedRpm; s.rpmCount++; }
    if (l.status === "DELIVERED") {
      s.delivered += 1;
      if (l.deliveryDate) {
        s.onTimeEligible += 1;
        // On-time = the load reached DELIVERED on/before the scheduled date
        // (plus a one-day grace), approximated by the record's last update.
        if (new Date(l.updatedAt) <= new Date(new Date(l.deliveryDate).getTime() + 86400000))
          s.onTime += 1;
      }
    }
  }
  const scorecards = Object.values(dmap)
    .map((s: any) => ({
      id: s.id, name: s.name, status: s.status,
      loads: s.loads, delivered: s.delivered,
      revenue: Math.round(s.revenue), profit: Math.round(s.profit),
      miles: Math.round(s.miles),
      deadheadPct: s.miles + s.deadMiles > 0 ? Math.round((s.deadMiles / (s.miles + s.deadMiles)) * 100) : 0,
      avgRpm: s.rpmCount ? Number((s.rpmSum / s.rpmCount).toFixed(2)) : 0,
      onTimePct: s.onTimeEligible ? Math.round((s.onTime / s.onTimeEligible) * 100) : null,
      revenuePerMile: s.miles > 0 ? Number((s.revenue / s.miles).toFixed(2)) : 0,
    }))
    .filter((s) => s.loads > 0)
    .sort((a, b) => b.profit - a.profit);

  // ---- Profit / revenue trend ----
  const trend: { label: string; revenue: number; profit: number; loads: number }[] = [];
  const now = new Date();
  for (let i = monthsWindow - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    let rev = 0, prof = 0, cnt = 0;
    for (const l of nonCancelled) {
      const ld = l.deliveryDate ?? l.createdAt;
      if (ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth()) {
        const p = computePnl(l, settings, l.truck?.mpg ?? null);
        rev += p.revenue; prof += p.netProfit; cnt++;
      }
    }
    trend.push({
      label: d.toLocaleString("en-US", { month: "short" }),
      revenue: Math.round(rev), profit: Math.round(prof), loads: cnt,
    });
  }

  // ---- Real expense mix (ledger + fuel) ----
  const expenseMix: Record<string, number> = {};
  let expenseTotal = 0;
  for (const e of expenses) {
    expenseMix[e.category] = (expenseMix[e.category] ?? 0) + e.amount;
    expenseTotal += e.amount;
  }
  const fuelTotal = fuel.reduce((s, f) => s + f.total, 0);
  if (fuelTotal > 0) {
    expenseMix["FUEL"] = (expenseMix["FUEL"] ?? 0) + fuelTotal;
    expenseTotal += fuelTotal;
  }

  // ---- Lane performance (top origin→destination pairs) ----
  const lanes: Record<string, { lane: string; loads: number; revenue: number; profit: number; miles: number }> = {};
  for (const l of nonCancelled) {
    const key = `${l.origin} → ${l.destination}`;
    if (!lanes[key]) lanes[key] = { lane: key, loads: 0, revenue: 0, profit: 0, miles: 0 };
    const p = computePnl(l, settings, l.truck?.mpg ?? null);
    lanes[key].loads += 1;
    lanes[key].revenue += p.revenue;
    lanes[key].profit += p.netProfit;
    lanes[key].miles += l.miles ?? 0;
  }
  const topLanes = Object.values(lanes)
    .map((l) => ({
      lane: l.lane, loads: l.loads,
      revenue: Math.round(l.revenue), profit: Math.round(l.profit),
      rpm: l.miles > 0 ? Number((l.revenue / l.miles).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8);

  // ---- Fleet true cost-per-mile ----
  const totalMiles = nonCancelled.reduce((s, l) => s + (l.miles ?? 0) + (l.deadheadMiles ?? 0), 0);
  const grossRevenue = nonCancelled.reduce((s, l) => s + computePnl(l, settings, l.truck?.mpg ?? null).revenue, 0);
  const trueCostPerMile = totalMiles > 0 ? Number((expenseTotal / totalMiles).toFixed(2)) : 0;

  // Fuel efficiency across the fleet (from logged gallons vs load miles).
  const totalGallons = fuel.reduce((s, f) => s + f.gallons, 0);
  const fleetMpg = totalGallons > 0 && totalMiles > 0 ? Number((totalMiles / totalGallons).toFixed(1)) : null;

  return NextResponse.json({
    scorecards,
    trend,
    expenseMix,
    expenseTotal: Math.round(expenseTotal),
    topLanes,
    kpis: {
      grossRevenue: Math.round(grossRevenue),
      totalMiles: Math.round(totalMiles),
      trueCostPerMile,
      fleetMpg,
      loadsDelivered: delivered.length,
      activeDrivers: scorecards.length,
    },
    settings,
  });
}
