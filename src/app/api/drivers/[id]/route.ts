import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Drivers may update their own availability status only.
  const isManager = can.manageDrivers(session.role);
  const isSelf = session.role === "DRIVER" && session.driverId === params.id;
  if (!isManager && !isSelf)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const data: any = {};

  if (isManager) {
    if (body.name !== undefined) data.name = body.name;
    if (body.phone !== undefined) data.phone = body.phone || null;
    if (body.truckNumber !== undefined) data.truckNumber = body.truckNumber || null;
    if (body.trailerNumber !== undefined)
      data.trailerNumber = body.trailerNumber || null;
    if (body.licenseNumber !== undefined)
      data.licenseNumber = body.licenseNumber || null;
    if (body.notes !== undefined) data.notes = body.notes || null;
  }
  if (body.status !== undefined) data.status = body.status;

  const driver = await prisma.driver.update({ where: { id: params.id }, data });
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

  // Unassign from loads first to avoid orphan references.
  await prisma.load.updateMany({
    where: { driverId: params.id },
    data: { driverId: null },
  });
  await prisma.user.updateMany({
    where: { driverId: params.id },
    data: { driverId: null },
  });
  await prisma.driver.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
