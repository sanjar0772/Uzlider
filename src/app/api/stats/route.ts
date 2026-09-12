import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";
import { computePnl, expiryStatus, CostSettings } from "@/lib/finance";

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

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ---- Driver dashboard ----
  if (session.role === "DRIVER") {
    const driverId = session.driverId ?? "__none__";
    const myLoads = await prisma.load.findMany({
      where: { driverId },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    });
    const current =
      myLoads.find((l) => l.status === "IN_TRANSIT" || l.status === "ASSIGNED") ??
      null;
    const driver = session.driverId
      ? await prisma.driver.findUnique({ where: { id: session.driverId } })
      : null;
    const myPay = myLoads
      .filter((l) => l.status === "DELIVERED")
      .reduce((s, l) => s + (l.driverPay ?? 0), 0);
    return NextResponse.json({
      role: "DRIVER",
      driver,
      current,
      counts: {
        total: myLoads.length,
        active: myLoads.filter((l) =>
          ["NEW", "ASSIGNED", "IN_TRANSIT"].includes(l.status)
        ).length,
        delivered: myLoads.filter((l) => l.status === "DELIVERED").length,
        myPay: Math.round(myPay),
      },
      recent: myLoads.slice(0, 6),
    });
  }

  // ---- Staff dashboard ----
  const settings = await getSettings();
  const [loads, driversAll, trucksAll, invoices] = await Promise.all([
    prisma.load.findMany({
      include: { driver: true, customer: true, truck: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.driver.findMany(),
    prisma.truck.findMany(),
    prisma.invoice.findMany(),
  ]);

  const nonCancelled = loads.filter((l) => l.status !== "CANCELLED");
  const active = loads.filter((l) =>
    ["NEW", "ASSIGNED", "IN_TRANSIT"].includes(l.status)
  );
  const delivered = loads.filter((l) => l.status === "DELIVERED");
  const unassigned = loads.filter(
    (l) => !l.driverId && l.status !== "CANCELLED" && l.status !== "DELIVERED"
  );

  // Financials
  let revenue = 0,
    fuelCost = 0,
    fixedCost = 0,
    driverCost = 0,
    netProfit = 0,
    totalMiles = 0,
    loadedMiles = 0,
    deadMiles = 0,
    rpmSum = 0,
    rpmCount = 0;
  for (const l of nonCancelled) {
    const p = computePnl(l, settings, l.truck?.mpg ?? null);
    revenue += p.revenue;
    fuelCost += p.fuelCost;
    fixedCost += p.fixedCost;
    driverCost += p.driverPay;
    netProfit += p.netProfit;
    totalMiles += p.totalMiles;
    loadedMiles += l.miles ?? 0;
    deadMiles += l.deadheadMiles ?? 0;
    if (p.loadedRpm > 0) {
      rpmSum += p.loadedRpm;
      rpmCount++;
    }
  }
  const avgRpm = rpmCount ? rpmSum / rpmCount : 0;
  const deadheadPct = loadedMiles + deadMiles > 0 ? (deadMiles / (loadedMiles + deadMiles)) * 100 : 0;
  const costPerMile = totalMiles > 0 ? (driverCost + fuelCost + fixedCost) / totalMiles : 0;

  // Loads by status
  const byStatus: Record<string, number> = {};
  for (const l of loads) byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;

  // Revenue & profit by month (last 6)
  const months: { label: string; value: number; profit: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    let rev = 0,
      prof = 0;
    for (const l of nonCancelled) {
      const ld = l.deliveryDate ?? l.createdAt;
      if (ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth()) {
        const p = computePnl(l, settings, l.truck?.mpg ?? null);
        rev += p.revenue;
        prof += p.netProfit;
      }
    }
    months.push({
      label: d.toLocaleString("en-US", { month: "short" }),
      value: Math.round(rev),
      profit: Math.round(prof),
    });
  }

  // Top drivers by revenue
  const agg: Record<string, { name: string; loads: number; revenue: number; profit: number }> = {};
  for (const l of loads) {
    if (!l.driver) continue;
    const k = l.driver.id;
    if (!agg[k]) agg[k] = { name: l.driver.name, loads: 0, revenue: 0, profit: 0 };
    agg[k].loads += 1;
    if (l.status !== "CANCELLED") {
      const p = computePnl(l, settings, l.truck?.mpg ?? null);
      agg[k].revenue += p.revenue;
      agg[k].profit += p.netProfit;
    }
  }
  const topDrivers = Object.values(agg)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((d) => ({ ...d, revenue: Math.round(d.revenue), profit: Math.round(d.profit) }));

  // Invoices
  const unpaidInvoices = invoices.filter((i) => i.status !== "PAID");
  const outstanding = unpaidInvoices.reduce((s, i) => s + i.amount, 0);
  const paidTotal = invoices
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + i.amount, 0);

  // Compliance — count expiring/expired docs
  let expiringSoon = 0,
    expired = 0;
  const checkDoc = (d: any) => {
    const st = expiryStatus(d);
    if (st === "soon") expiringSoon++;
    else if (st === "expired") expired++;
  };
  for (const dr of driversAll) {
    checkDoc(dr.cdlExpiry);
    checkDoc(dr.medicalExpiry);
  }
  for (const tr of trucksAll) {
    checkDoc(tr.registrationExpiry);
    checkDoc(tr.inspectionExpiry);
    checkDoc(tr.insuranceExpiry);
  }

  return NextResponse.json({
    role: session.role,
    canFinancials: can.viewFinancials(session.role),
    settings,
    counts: {
      total: loads.length,
      active: active.length,
      delivered: delivered.length,
      unassigned: unassigned.length,
      driversAvailable: driversAll.filter((d) => d.status === "AVAILABLE").length,
      driversTotal: driversAll.length,
      trucksActive: trucksAll.filter((t) => t.status === "ACTIVE").length,
      trucksTotal: trucksAll.length,
    },
    finance: {
      revenue: Math.round(revenue),
      netProfit: Math.round(netProfit),
      fuelCost: Math.round(fuelCost),
      fixedCost: Math.round(fixedCost),
      driverCost: Math.round(driverCost),
      marginPct: revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0,
      avgRpm: Number(avgRpm.toFixed(2)),
      targetRpm: settings.targetRpm,
      totalMiles: Math.round(totalMiles),
      deadheadPct: Math.round(deadheadPct),
      costPerMile: Number(costPerMile.toFixed(2)),
      outstanding: Math.round(outstanding),
      paidTotal: Math.round(paidTotal),
      unpaidCount: unpaidInvoices.length,
    },
    compliance: { expiringSoon, expired },
    byStatus,
    revenueByMonth: months,
    topDrivers,
    recent: loads.slice(0, 6),
    unassignedList: unassigned.slice(0, 6),
  });
}
