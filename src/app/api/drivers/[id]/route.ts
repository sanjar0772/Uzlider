import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isDriverStatus } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

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
