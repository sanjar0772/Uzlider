import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isTruckStatus } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trucks = await prisma.truck.findMany({
    orderBy: { unitNumber: "asc" },
    include: {
      driver: true,
      _count: { select: { loads: true } },
    },
  });
  return NextResponse.json({ trucks });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageTrucks(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.unitNumber)
    return NextResponse.json({ error: "Unit # required" }, { status: 400 });
  if (body.status && !isTruckStatus(body.status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  try {
    const truck = await prisma.truck.create({
      data: {
        unitNumber: String(body.unitNumber).trim(),
        plate: body.plate || null,
        make: body.make || null,
        model: body.model || null,
        year: body.year ? Number(body.year) : null,
        vin: body.vin || null,
        status: body.status || "ACTIVE",
        odometer: body.odometer ? Number(body.odometer) : null,
        mpg: body.mpg ? Number(body.mpg) : null,
        registrationExpiry: body.registrationExpiry ? new Date(body.registrationExpiry) : null,
        inspectionExpiry: body.inspectionExpiry ? new Date(body.inspectionExpiry) : null,
        insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : null,
        notes: body.notes || null,
        driverId: body.driverId || null,
      },
    });
    await logActivity(session, "created", "truck", truck.unitNumber);
    return NextResponse.json({ truck });
  } catch (e: any) {
    if (e.code === "P2002")
      return NextResponse.json(
        { error: "Unit # or driver already used" },
        { status: 409 }
      );
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
