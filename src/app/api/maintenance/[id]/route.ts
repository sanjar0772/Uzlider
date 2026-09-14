import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isMaintenanceType } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageMaintenance(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const data: any = {};
  if (body.truckId !== undefined) data.truckId = body.truckId;
  if (body.date !== undefined) data.date = body.date ? new Date(body.date) : new Date();
  if (body.type !== undefined) {
    if (!isMaintenanceType(body.type))
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    data.type = body.type;
  }
  if (body.description !== undefined) data.description = body.description;
  if (body.odometer !== undefined) data.odometer = body.odometer ? Number(body.odometer) : null;
  if (body.cost !== undefined) data.cost = body.cost ? Number(body.cost) : null;
  if (body.vendor !== undefined) data.vendor = body.vendor || null;
  if (body.nextServiceDate !== undefined)
    data.nextServiceDate = body.nextServiceDate ? new Date(body.nextServiceDate) : null;
  if (body.nextServiceOdometer !== undefined)
    data.nextServiceOdometer = body.nextServiceOdometer ? Number(body.nextServiceOdometer) : null;

  const record = await prisma.maintenanceRecord.update({ where: { id: params.id }, data });
  await logActivity(session, "updated", "maintenance");
  return NextResponse.json({ record });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageMaintenance(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.maintenanceRecord.delete({ where: { id: params.id } });
  await logActivity(session, "deleted", "maintenance");
  return NextResponse.json({ ok: true });
}
