import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isLoadStatus } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { notifyLoadStatus } from "@/lib/telegram";

// Add a status update / note to a load. Optionally moves the load status.
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.updateStatus(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const load = await prisma.load.findUnique({ where: { id: params.id } });
  if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role === "DRIVER" && load.driverId !== session.driverId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (body.status && !isLoadStatus(body.status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const update = await prisma.loadUpdate.create({
    data: {
      loadId: params.id,
      status: body.status || null,
      location: body.location || null,
      note: body.note || null,
      authorId: session.id,
      authorName: session.name,
    },
  });

  // If a status was supplied, also move the load status.
  if (body.status && body.status !== load.status) {
    const updated = await prisma.load.update({
      where: { id: params.id },
      data: { status: body.status },
    });
    await logActivity(session, "status_changed", "load", load.refNumber, `→ ${body.status}`);
    notifyLoadStatus(updated, body.status, session.name, body.location || body.note || null).catch(
      () => {}
    );
  }

  return NextResponse.json({ update });
}
