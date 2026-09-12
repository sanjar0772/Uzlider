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

  const settlements = Object.values(byDriver)
    .map((s) => ({ ...s, gross: Math.round(s.gross) }))
    .sort((a, b) => b.gross - a.gross);

  return NextResponse.json({ settlements });
}
