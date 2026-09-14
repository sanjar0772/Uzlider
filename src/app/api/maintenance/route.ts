import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isMaintenanceType } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

// List maintenance records, newest first. Optional ?truckId= filter.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.viewMaintenance(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const where: any = {};
  const truckId = searchParams.get("truckId");
  if (truckId) where.truckId = truckId;

  const records = await prisma.maintenanceRecord.findMany({
    where,
    include: { truck: true },
    orderBy: { date: "desc" },
  });

  const totalCost = records.reduce((s, r) => s + (r.cost ?? 0), 0);

  // Upcoming service reminders (by date within 30 days, or already past).
  const now = Date.now();
  const upcoming = records
    .filter((r) => r.nextServiceDate)
    .map((r) => ({
      id: r.id,
      truck: r.truck?.unitNumber ?? "—",
      type: r.type,
      nextServiceDate: r.nextServiceDate,
      days: Math.ceil((new Date(r.nextServiceDate!).getTime() - now) / 86400000),
    }))
    .filter((r) => r.days <= 30)
    .sort((a, b) => a.days - b.days);

  return NextResponse.json({ records, totalCost, upcoming });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageMaintenance(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.truckId)
    return NextResponse.json({ error: "Truck required" }, { status: 400 });
  if (!body.description)
    return NextResponse.json({ error: "Description required" }, { status: 400 });
  if (body.type && !isMaintenanceType(body.type))
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const record = await prisma.maintenanceRecord.create({
    data: {
      truckId: body.truckId,
      date: body.date ? new Date(body.date) : new Date(),
      type: body.type || "SERVICE",
      description: String(body.description).trim(),
      odometer: body.odometer ? Number(body.odometer) : null,
      cost: body.cost ? Number(body.cost) : null,
      vendor: body.vendor || null,
      nextServiceDate: body.nextServiceDate ? new Date(body.nextServiceDate) : null,
      nextServiceOdometer: body.nextServiceOdometer ? Number(body.nextServiceOdometer) : null,
      createdById: session.id,
      createdByName: session.name,
    },
    include: { truck: true },
  });
  await logActivity(session, "created", "maintenance", record.truck?.unitNumber, body.type);
  return NextResponse.json({ record });
}
