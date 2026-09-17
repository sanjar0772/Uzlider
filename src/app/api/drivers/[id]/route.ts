import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isDriverStatus } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { computePnl, expiryStatus, CostSettings } from "@/lib/finance";

async function getSettings(): Promise<CostSettings> {
  let s = await prisma.companySettings.findFirst();
  if (!s) s = await prisma.companySettings.create({ data: { id: "company" } });
  return {
    mpg: s.mpg, fuelPricePerGallon: s.fuelPricePerGallon,
    fixedCostPerMile: s.fixedCostPerMile, targetRpm: s.targetRpm,
    factoringRatePct: s.factoringRatePct,
  };
}

// 360° driver record: scorecard, settlement, compliance and fuel history.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isSelf = session.role === "DRIVER" && session.driverId === params.id;
  if (!can.manageDrivers(session.role) && !isSelf)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const driver = await prisma.driver.findUnique({
    where: { id: params.id },
    include: { truck: true, account: { select: { id: true, name: true, email: true, role: true } } },
  });
  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await getSettings();
  const [loads, fuel, expenses, documents] = await Promise.all([
    prisma.load.findMany({ where: { driverId: params.id }, include: { customer: true, truck: true }, orderBy: { createdAt: "desc" } }),
    prisma.fuelPurchase.findMany({ where: { driverId: params.id }, orderBy: { date: "desc" }, take: 20 }),
    prisma.expense.findMany({ where: { driverId: params.id } }),
    prisma.document.count({ where: { driverId: params.id } }),
  ]);

  const active = loads.filter((l) => l.status !== "CANCELLED");
  const delivered = loads.filter((l) => l.status === "DELIVERED");
  let revenue = 0, profit = 0, miles = 0, deadMiles = 0, rpmSum = 0, rpmCount = 0;
  let onTime = 0, onTimeEligible = 0;
  for (const l of active) {
    const p = computePnl(l, settings, l.truck?.mpg ?? null);
    revenue += p.revenue;
    profit += p.netProfit;
    miles += l.miles ?? 0;
    deadMiles += l.deadheadMiles ?? 0;
    if (p.loadedRpm > 0) { rpmSum += p.loadedRpm; rpmCount++; }
    if (l.status === "DELIVERED" && l.deliveryDate) {
      onTimeEligible++;
      if (new Date(l.updatedAt) <= new Date(new Date(l.deliveryDate).getTime() + 86400000)) onTime++;
    }
  }

  const grossPay = delivered.reduce((s, l) => s + (l.driverPay ?? 0), 0);
  const deductions = expenses.reduce((s, e) => s + e.amount, 0);

  return NextResponse.json({
    driver,
    loads,
    fuel,
    documentsCount: documents,
    compliance: {
      cdl: { date: driver.cdlExpiry, status: expiryStatus(driver.cdlExpiry) },
      medical: { date: driver.medicalExpiry, status: expiryStatus(driver.medicalExpiry) },
    },
    scorecard: {
      loads: loads.length,
      delivered: delivered.length,
      revenue: Math.round(revenue),
      profit: Math.round(profit),
      miles: Math.round(miles),
      deadheadPct: miles + deadMiles > 0 ? Math.round((deadMiles / (miles + deadMiles)) * 100) : 0,
      avgRpm: rpmCount ? Number((rpmSum / rpmCount).toFixed(2)) : 0,
      onTimePct: onTimeEligible ? Math.round((onTime / onTimeEligible) * 100) : null,
      revenuePerMile: miles > 0 ? Number((revenue / miles).toFixed(2)) : 0,
    },
    settlement: {
      grossPay: Math.round(grossPay),
      deductions: Math.round(deductions),
      netPay: Math.round(grossPay - deductions),
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isManager = can.manageDrivers(session.role);
  const isSelf = session.role === "DRIVER" && session.driverId === params.id;
  if (!isManager && !isSelf)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const data: any = {};

  if (isManager) {
    if (body.name !== undefined) data.name = body.name;
    if (body.phone !== undefined) data.phone = body.phone || null;
    if (body.email !== undefined) data.email = body.email || null;
    if (body.truckNumber !== undefined) data.truckNumber = body.truckNumber || null;
    if (body.trailerNumber !== undefined)
      data.trailerNumber = body.trailerNumber || null;
    if (body.licenseNumber !== undefined)
      data.licenseNumber = body.licenseNumber || null;
    if (body.cdlExpiry !== undefined)
      data.cdlExpiry = body.cdlExpiry ? new Date(body.cdlExpiry) : null;
    if (body.medicalExpiry !== undefined)
      data.medicalExpiry = body.medicalExpiry ? new Date(body.medicalExpiry) : null;
    if (body.hireDate !== undefined)
      data.hireDate = body.hireDate ? new Date(body.hireDate) : null;
    if (body.homeBase !== undefined) data.homeBase = body.homeBase || null;
    if (body.notes !== undefined) data.notes = body.notes || null;
  }
  if (body.status !== undefined) {
    if (!isDriverStatus(body.status))
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    data.status = body.status;
  }
  if (body.availableHours !== undefined && body.availableHours !== "")
    data.availableHours = Number(body.availableHours);

  const driver = await prisma.driver.update({ where: { id: params.id }, data });
  await logActivity(session, "updated", "driver", driver.name);
  return NextResponse.json({ driver });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageDrivers(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const driver = await prisma.driver.findUnique({ where: { id: params.id } });
  await prisma.load.updateMany({
    where: { driverId: params.id },
    data: { driverId: null },
  });
  await prisma.user.updateMany({
    where: { driverId: params.id },
    data: { driverId: null },
  });
  await prisma.truck.updateMany({
    where: { driverId: params.id },
    data: { driverId: null },
  });
  await prisma.driver.delete({ where: { id: params.id } });
  await logActivity(session, "deleted", "driver", driver?.name);
  return NextResponse.json({ ok: true });
}
