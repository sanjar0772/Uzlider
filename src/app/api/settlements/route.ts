import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";

// Per-driver settlement (driver pay for delivered loads) over an optional range.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.viewReports(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: any = { status: "DELIVERED", driverId: { not: null } };
  if (from || to) {
    where.deliveryDate = {};
    if (from) where.deliveryDate.gte = new Date(from);
    if (to) where.deliveryDate.lte = new Date(to + "T23:59:59");
  }

  const loads = await prisma.load.findMany({
    where,
    include: { driver: true },
    orderBy: { deliveryDate: "desc" },
  });

  const byDriver: Record<
    string,
    { driverId: string; name: string; count: number; gross: number; loads: any[] }
  > = {};
  for (const l of loads) {
    if (!l.driver) continue;
    const k = l.driver.id;
    if (!byDriver[k])
      byDriver[k] = { driverId: k, name: l.driver.name, count: 0, gross: 0, loads: [] };
    byDriver[k].count += 1;
    byDriver[k].gross += l.driverPay ?? 0;
    byDriver[k].loads.push({
      refNumber: l.refNumber,
      origin: l.origin,
      destination: l.destination,
      deliveryDate: l.deliveryDate,
      driverPay: l.driverPay ?? 0,
    });
  }

  // Driver-attributed expenses in the same window become payroll deductions.
  const expWhere: any = { driverId: { not: null } };
  if (from || to) {
    expWhere.date = {};
    if (from) expWhere.date.gte = new Date(from);
    if (to) expWhere.date.lte = new Date(to + "T23:59:59");
  }
  const expenses = await prisma.expense.findMany({ where: expWhere });
  const dedByDriver: Record<string, number> = {};
  for (const e of expenses) {
    if (!e.driverId) continue;
    dedByDriver[e.driverId] = (dedByDriver[e.driverId] ?? 0) + e.amount;
  }

  const settlements = Object.values(byDriver)
    .map((s) => {
      const deductions = Math.round(dedByDriver[s.driverId] ?? 0);
      return {
        ...s,
        gross: Math.round(s.gross),
        deductions,
        net: Math.round(s.gross) - deductions,
      };
    })
    .sort((a, b) => b.net - a.net);

  return NextResponse.json({ settlements });
}
