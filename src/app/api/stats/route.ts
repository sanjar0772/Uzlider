import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ---- Driver: minimal, own-scoped ----
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
      },
      recent: myLoads.slice(0, 6),
    });
  }

  // ---- Staff: company-wide ----
  const [loads, driversAll, trucksAll, invoices] = await Promise.all([
    prisma.load.findMany({
      include: { driver: true, customer: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.driver.findMany(),
    prisma.truck.findMany(),
    prisma.invoice.findMany(),
  ]);

  const active = loads.filter((l) =>
    ["NEW", "ASSIGNED", "IN_TRANSIT"].includes(l.status)
  );
  const delivered = loads.filter((l) => l.status === "DELIVERED");
  const unassigned = loads.filter(
    (l) => !l.driverId && l.status !== "CANCELLED" && l.status !== "DELIVERED"
  );

  const revenue = loads
    .filter((l) => l.status !== "CANCELLED")
    .reduce((s, l) => s + (l.rate ?? 0), 0);
  const driverCost = loads
    .filter((l) => l.status !== "CANCELLED")
    .reduce((s, l) => s + (l.driverPay ?? 0), 0);
  const margin = revenue - driverCost;
  const ratedLoads = loads.filter((l) => l.rate);
  const avgRate = ratedLoads.length
    ? revenue / ratedLoads.filter((l) => l.status !== "CANCELLED").length
    : 0;

  // Loads by status
  const byStatus: Record<string, number> = {};
  for (const l of loads) byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;

  // Revenue by month (last 6 months)
  const months: { label: string; value: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("en-US", { month: "short" });
    const sum = loads
      .filter((l) => {
        const ld = l.deliveryDate ?? l.createdAt;
        return (
          l.status !== "CANCELLED" &&
          ld.getFullYear() === d.getFullYear() &&
          ld.getMonth() === d.getMonth()
        );
      })
      .reduce((s, l) => s + (l.rate ?? 0), 0);
    months.push({ label, value: Math.round(sum) });
  }

  // Top drivers by delivered revenue
  const driverAgg: Record<string, { name: string; loads: number; revenue: number }> =
    {};
  for (const l of loads) {
    if (!l.driver) continue;
    const key = l.driver.id;
    if (!driverAgg[key])
      driverAgg[key] = { name: l.driver.name, loads: 0, revenue: 0 };
    driverAgg[key].loads += 1;
    if (l.status !== "CANCELLED") driverAgg[key].revenue += l.rate ?? 0;
  }
  const topDrivers = Object.values(driverAgg)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const unpaidInvoices = invoices.filter((i) => i.status !== "PAID");
  const outstanding = unpaidInvoices.reduce((s, i) => s + i.amount, 0);
  const paidTotal = invoices
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + i.amount, 0);

  return NextResponse.json({
    role: session.role,
    canFinancials: can.viewFinancials(session.role),
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
      margin: Math.round(margin),
      avgRate: Math.round(avgRate),
      outstanding: Math.round(outstanding),
      paidTotal: Math.round(paidTotal),
      unpaidCount: unpaidInvoices.length,
    },
    byStatus,
    revenueByMonth: months,
    topDrivers,
    recent: loads.slice(0, 6),
    unassignedList: unassigned.slice(0, 6),
  });
}
