import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isStopType } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

// Add a stop to a load (multi-stop / multi-drop lanes).
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.editLoad(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.location)
    return NextResponse.json({ error: "Location required" }, { status: 400 });
  if (body.type && !isStopType(body.type))
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const count = await prisma.loadStop.count({ where: { loadId: params.id } });
  const stop = await prisma.loadStop.create({
    data: {
      loadId: params.id,
      type: body.type || "DROPOFF",
      sequence: body.sequence != null ? Number(body.sequence) : count,
      location: String(body.location).trim(),
      contact: body.contact || null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      note: body.note || null,
    },
  });
  const load = await prisma.load.findUnique({ where: { id: params.id }, select: { refNumber: true } });
  await logActivity(session, "added_stop", "load", load?.refNumber, body.location);
  return NextResponse.json({ stop });
}
