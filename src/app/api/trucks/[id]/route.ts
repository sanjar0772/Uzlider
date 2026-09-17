import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isTruckStatus } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { computePnl, CostSettings } from "@/lib/finance";

async function getSettings(): Promise<CostSettings> {
  let s = await prisma.companySettings.findFirst();
  if (!s) s = await prisma.companySettings.create({ data: { id: "company" } });
  return {
    mpg: s.mpg, fuelPricePerGallon: s.fuelPricePerGallon,
    fixedCostPerMile: s.fixedCostPerMile, targetRpm: s.targetRpm,
    factoringRatePct: s.factoringRatePct,
  };
}

// 360° truck record: profitability, real tank-to-tank MPG, out-of-pocket
// cost-per-mile and every related load / fuel / maintenance / expense.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "DRIVER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const truck = await prisma.truck.findUnique({
    where: { id: params.id },
    include: { driver: true },
  });
  if (!truck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await getSettings();
  const [loads, maintenance, fuel, expenses, documents] = await Promise.all([
    prisma.load.findMany({ where: { truckId: params.id }, include: { customer: true, driver: true }, orderBy: { createdAt: "desc" } }),
    prisma.maintenanceRecord.findMany({ where: { truckId: params.id }, orderBy: { date: "desc" } }),
    prisma.fuelPurchase.findMany({ where: { truckId: params.id }, orderBy: { date: "desc" } }),
    prisma.expense.findMany({ where: { truckId: params.id }, orderBy: { date: "desc" } }),
    prisma.document.count({ where: { truckId: params.id } }),
  ]);

  const active = loads.filter((l) => l.status !== "CANCELLED");
  let revenue = 0, profit = 0, driverPay = 0, loadedMiles = 0, totalMiles = 0;
  for (const l of active) {
    const p = computePnl(l, settings, truck.mpg);
    revenue += p.revenue;
    profit += p.netProfit;
    driverPay += p.driverPay;
    loadedMiles += l.miles ?? 0;
    totalMiles += p.totalMiles;
  }

  const fuelCost = fuel.reduce((s, f) => s + f.total, 0);
  const fuelGallons = fuel.reduce((s, f) => s + f.gallons, 0);
  const maintCost = maintenance.reduce((s, m) => s + (m.cost ?? 0), 0);
  const expenseCost = expenses.reduce((s, e) => s + e.amount, 0);

  // Real tank-to-tank MPG from odometer-tagged fills.
  const withOdo = fuel.filter((f) => f.odometer != null).sort((a, b) => (a.odometer! - b.odometer!));
  let realMpg: number | null = null;
  if (withOdo.length >= 2) {
    const miles = withOdo[withOdo.length - 1].odometer! - withOdo[0].odometer!;
    const gallons = withOdo.slice(1).reduce((s, f) => s + f.gallons, 0); // exclude the first fill
    if (miles > 0 && gallons > 0) realMpg = Number((miles / gallons).toFixed(1));
  }

  const outOfPocket = fuelCost + maintCost + expenseCost;
  const costPerMile = totalMiles > 0 ? Number((outOfPocket / totalMiles).toFixed(2)) : 0;
  const netContribution = revenue - driverPay - outOfPocket;

  return NextResponse.json({
    truck,
    loads,
    maintenance,
    fuel,
    expenses,
    documentsCount: documents,
    metrics: {
      loadsCount: active.length,
      revenue: Math.round(revenue),
      profit: Math.round(profit),
      driverPay: Math.round(driverPay),
      loadedMiles: Math.round(loadedMiles),
      totalMiles: Math.round(totalMiles),
      fuelCost: Math.round(fuelCost),
      fuelGallons: Number(fuelGallons.toFixed(1)),
      maintCost: Math.round(maintCost),
      expenseCost: Math.round(expenseCost),
      realMpg,
      costPerMile,
      netContribution: Math.round(netContribution),
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageTrucks(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const data: any = {};
  if (body.unitNumber !== undefined) data.unitNumber = body.unitNumber;
  if (body.plate !== undefined) data.plate = body.plate || null;
  if (body.make !== undefined) data.make = body.make || null;
  if (body.model !== undefined) data.model = body.model || null;
  if (body.year !== undefined) data.year = body.year ? Number(body.year) : null;
  if (body.vin !== undefined) data.vin = body.vin || null;
  if (body.status !== undefined) {
    if (!isTruckStatus(body.status))
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    data.status = body.status;
  }
  if (body.odometer !== undefined) data.odometer = body.odometer ? Number(body.odometer) : null;
  if (body.mpg !== undefined) data.mpg = body.mpg ? Number(body.mpg) : null;
  if (body.registrationExpiry !== undefined)
    data.registrationExpiry = body.registrationExpiry ? new Date(body.registrationExpiry) : null;
  if (body.inspectionExpiry !== undefined)
    data.inspectionExpiry = body.inspectionExpiry ? new Date(body.inspectionExpiry) : null;
  if (body.insuranceExpiry !== undefined)
    data.insuranceExpiry = body.insuranceExpiry ? new Date(body.insuranceExpiry) : null;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.driverId !== undefined) data.driverId = body.driverId || null;

  try {
    const truck = await prisma.truck.update({ where: { id: params.id }, data });
    await logActivity(session, "updated", "truck", truck.unitNumber);
    return NextResponse.json({ truck });
  } catch (e: any) {
    if (e.code === "P2002")
      return NextResponse.json(
        { error: "Unit # or driver already used" },
        { status: 409 }
      );
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageTrucks(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const truck = await prisma.truck.findUnique({ where: { id: params.id } });
  await prisma.load.updateMany({
    where: { truckId: params.id },
    data: { truckId: null },
  });
  await prisma.truck.delete({ where: { id: params.id } });
  await logActivity(session, "deleted", "truck", truck?.unitNumber);
  return NextResponse.json({ ok: true });
}
