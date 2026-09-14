import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isLoadStatus, isEquipmentType } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { notifyNewLoad } from "@/lib/telegram";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status")?.trim();

  const where: any = {};
  if (session.role === "DRIVER") {
    where.driverId = session.driverId ?? "__none__";
  }
  if (status && status !== "ALL") where.status = status;
  if (q) {
    const like = { contains: q, mode: "insensitive" as const };
    where.OR = [
      { refNumber: like },
      { origin: like },
      { destination: like },
      { broker: like },
      { commodity: like },
    ];
  }

  const loads = await prisma.load.findMany({
    where,
    include: {
      driver: true,
      truck: true,
      customer: true,
      invoice: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ loads });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.createLoad(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.refNumber || !body.origin || !body.destination) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (body.status && !isLoadStatus(body.status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  if (body.equipment && !isEquipmentType(body.equipment))
    return NextResponse.json({ error: "Invalid equipment" }, { status: 400 });

  try {
    const load = await prisma.load.create({
      data: {
        refNumber: String(body.refNumber).trim(),
        broker: body.broker || null,
        origin: body.origin,
        destination: body.destination,
        pickupDate: body.pickupDate ? new Date(body.pickupDate) : null,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
        rate: body.rate ? Number(body.rate) : null,
        driverPay: body.driverPay ? Number(body.driverPay) : null,
        miles: body.miles ? Number(body.miles) : null,
        deadheadMiles: body.deadheadMiles ? Number(body.deadheadMiles) : null,
        detention: body.detention ? Number(body.detention) : null,
        lumperFee: body.lumperFee ? Number(body.lumperFee) : null,
        otherCharges: body.otherCharges ? Number(body.otherCharges) : null,
        weight: body.weight ? Number(body.weight) : null,
        commodity: body.commodity || null,
        equipment: body.equipment || "VAN",
        status: body.status || (body.driverId ? "ASSIGNED" : "NEW"),
        customerId: body.customerId || null,
        driverId: body.driverId || null,
        truckId: body.truckId || null,
        dispatcherId: session.id,
        dispatcherName: session.name,
        notes: body.notes || null,
        aiGenerated: Boolean(body.aiGenerated),
        needsReview: Boolean(body.needsReview),
        source: body.source || "manual",
      },
    });
    await logActivity(session, "created", "load", load.refNumber);
    notifyNewLoad(load, session.name).catch(() => {});
    return NextResponse.json({ load });
  } catch (e: any) {
    if (e.code === "P2002")
      return NextResponse.json({ error: "Ref # already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
