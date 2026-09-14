import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isLoadStatus, isEquipmentType } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { notifyLoadStatus } from "@/lib/telegram";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const load = await prisma.load.findUnique({
    where: { id: params.id },
    include: {
      driver: true,
      truck: true,
      customer: true,
      invoice: true,
      updates: { orderBy: { createdAt: "desc" } },
      stops: { orderBy: { sequence: "asc" } },
    },
  });
  if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role === "DRIVER" && load.driverId !== session.driverId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ load });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.load.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const isFullEditor = can.editLoad(session.role);
  const data: any = {};

  if (isFullEditor) {
    if (body.refNumber !== undefined) data.refNumber = body.refNumber;
    if (body.broker !== undefined) data.broker = body.broker || null;
    if (body.origin !== undefined) data.origin = body.origin;
    if (body.destination !== undefined) data.destination = body.destination;
    if (body.pickupDate !== undefined)
      data.pickupDate = body.pickupDate ? new Date(body.pickupDate) : null;
    if (body.deliveryDate !== undefined)
      data.deliveryDate = body.deliveryDate ? new Date(body.deliveryDate) : null;
    if (body.rate !== undefined) data.rate = body.rate ? Number(body.rate) : null;
    if (body.driverPay !== undefined)
      data.driverPay = body.driverPay ? Number(body.driverPay) : null;
    if (body.miles !== undefined) data.miles = body.miles ? Number(body.miles) : null;
    if (body.deadheadMiles !== undefined)
      data.deadheadMiles = body.deadheadMiles ? Number(body.deadheadMiles) : null;
    if (body.detention !== undefined)
      data.detention = body.detention ? Number(body.detention) : null;
    if (body.lumperFee !== undefined)
      data.lumperFee = body.lumperFee ? Number(body.lumperFee) : null;
    if (body.otherCharges !== undefined)
      data.otherCharges = body.otherCharges ? Number(body.otherCharges) : null;
    if (body.weight !== undefined)
      data.weight = body.weight ? Number(body.weight) : null;
    if (body.commodity !== undefined) data.commodity = body.commodity || null;
    if (body.equipment !== undefined) {
      if (!isEquipmentType(body.equipment))
        return NextResponse.json({ error: "Invalid equipment" }, { status: 400 });
      data.equipment = body.equipment;
    }
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.customerId !== undefined) data.customerId = body.customerId || null;
    if (body.driverId !== undefined) data.driverId = body.driverId || null;
    if (body.truckId !== undefined) data.truckId = body.truckId || null;
  }

  if (body.status !== undefined) {
    if (!can.updateStatus(session.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!isLoadStatus(body.status))
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    if (session.role === "DRIVER" && existing.driverId !== session.driverId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    data.status = body.status;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const load = await prisma.load.update({ where: { id: params.id }, data });
    await logActivity(
      session,
      data.status && Object.keys(data).length === 1 ? "status_changed" : "updated",
      "load",
      load.refNumber,
      data.status ? `→ ${data.status}` : null
    );
    if (data.status && data.status !== existing.status) {
      notifyLoadStatus(load, data.status, session.name).catch(() => {});
    }
    return NextResponse.json({ load });
  } catch (e: any) {
    if (e.code === "P2002")
      return NextResponse.json({ error: "Ref # already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.deleteLoad(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const load = await prisma.load.findUnique({ where: { id: params.id } });
  await prisma.load.delete({ where: { id: params.id } });
  await logActivity(session, "deleted", "load", load?.refNumber);
  return NextResponse.json({ ok: true });
}
