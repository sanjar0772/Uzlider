import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

// A driver may edit/delete only their own fuel stops; staff manage all.
async function guard(id: string, session: { role: string; driverId?: string | null }) {
  if (session.role === "DRIVER") {
    const p = await prisma.fuelPurchase.findUnique({ where: { id } });
    if (!p || p.driverId !== session.driverId) return false;
    return true;
  }
  return can.viewFuel(session.role);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await guard(params.id, session)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const data: any = {};
  if (body.date !== undefined) data.date = body.date ? new Date(body.date) : new Date();
  if (body.gallons !== undefined) {
    const g = Number(body.gallons);
    if (!g || g <= 0) return NextResponse.json({ error: "Gallons required" }, { status: 400 });
    data.gallons = g;
  }
  if (body.pricePerGallon !== undefined) data.pricePerGallon = Number(body.pricePerGallon) || 0;
  if (body.total !== undefined) data.total = Number(body.total) || 0;
  if (body.state !== undefined)
    data.state = body.state ? String(body.state).toUpperCase().slice(0, 2) : null;
  if (body.location !== undefined) data.location = body.location || null;
  if (body.odometer !== undefined) data.odometer = body.odometer ? Number(body.odometer) : null;
  if (body.truckId !== undefined) data.truckId = body.truckId || null;
  if (body.loadId !== undefined) data.loadId = body.loadId || null;
  // recompute ppg if we have both total and gallons after merge
  if (data.gallons && data.total && !body.pricePerGallon)
    data.pricePerGallon = Number((data.total / data.gallons).toFixed(3));

  const purchase = await prisma.fuelPurchase.update({ where: { id: params.id }, data });
  await logActivity(session, "updated", "fuel", purchase.state);
  return NextResponse.json({ purchase });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await guard(params.id, session)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.fuelPurchase.delete({ where: { id: params.id } });
  await logActivity(session, "deleted", "fuel");
  return NextResponse.json({ ok: true });
}
