import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isStopType } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

// Update a stop — mark arrived/completed, edit details. Drivers who can post
// status updates may check off stops; editing details needs editLoad.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; stopId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const isCheckoff =
    Object.keys(body).every((k) => ["arrivedAt", "completedAt"].includes(k));
  if (!isCheckoff && !can.editLoad(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (isCheckoff && !can.updateStatus(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data: any = {};
  if (body.type !== undefined) {
    if (!isStopType(body.type))
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    data.type = body.type;
  }
  if (body.sequence !== undefined) data.sequence = Number(body.sequence);
  if (body.location !== undefined) data.location = body.location;
  if (body.contact !== undefined) data.contact = body.contact || null;
  if (body.scheduledAt !== undefined)
    data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (body.arrivedAt !== undefined)
    data.arrivedAt = body.arrivedAt ? new Date(body.arrivedAt) : null;
  if (body.completedAt !== undefined)
    data.completedAt = body.completedAt ? new Date(body.completedAt) : null;
  if (body.note !== undefined) data.note = body.note || null;

  const stop = await prisma.loadStop.update({ where: { id: params.stopId }, data });
  return NextResponse.json({ stop });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; stopId: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.editLoad(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.loadStop.delete({ where: { id: params.stopId } });
  await logActivity(session, "removed_stop", "load");
  return NextResponse.json({ ok: true });
}
