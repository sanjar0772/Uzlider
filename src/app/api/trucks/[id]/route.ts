import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

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
  if (body.status !== undefined) data.status = body.status;
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
