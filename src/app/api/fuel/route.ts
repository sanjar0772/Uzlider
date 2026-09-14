import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

// List fuel purchases, newest first. Optional ?truckId= / ?driverId= / date range.
// Drivers only ever see their own fuel stops.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const where: any = {};

  if (session.role === "DRIVER") {
    where.driverId = session.driverId ?? "__none__";
  } else {
    if (!can.viewFuel(session.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const truckId = searchParams.get("truckId");
    if (truckId) where.truckId = truckId;
    const driverId = searchParams.get("driverId");
    if (driverId) where.driverId = driverId;
  }
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to + "T23:59:59");
  }

  const purchases = await prisma.fuelPurchase.findMany({
    where,
    include: { truck: true, driver: true },
    orderBy: { date: "desc" },
  });

  const totalGallons = purchases.reduce((s, p) => s + p.gallons, 0);
  const totalCost = purchases.reduce((s, p) => s + p.total, 0);
  const avgPrice = totalGallons > 0 ? totalCost / totalGallons : 0;

  return NextResponse.json({
    purchases,
    totalGallons: Number(totalGallons.toFixed(1)),
    totalCost: Math.round(totalCost),
    avgPrice: Number(avgPrice.toFixed(3)),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageFuel(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const gallons = Number(body.gallons);
  if (!gallons || gallons <= 0)
    return NextResponse.json({ error: "Gallons required" }, { status: 400 });

  // total may be supplied directly, or derived from price/gallon.
  const pricePerGallon = Number(body.pricePerGallon) || 0;
  const total = body.total ? Number(body.total) : Number((gallons * pricePerGallon).toFixed(2));
  if (!total || total <= 0)
    return NextResponse.json({ error: "Total or price required" }, { status: 400 });
  const ppg = pricePerGallon > 0 ? pricePerGallon : Number((total / gallons).toFixed(3));

  // A driver may only file fuel against their own driver record.
  const driverId =
    session.role === "DRIVER" ? session.driverId ?? null : body.driverId || null;

  const purchase = await prisma.fuelPurchase.create({
    data: {
      date: body.date ? new Date(body.date) : new Date(),
      gallons,
      pricePerGallon: ppg,
      total,
      state: body.state ? String(body.state).toUpperCase().slice(0, 2) : null,
      location: body.location || null,
      odometer: body.odometer ? Number(body.odometer) : null,
      truckId: body.truckId || null,
      driverId,
      loadId: body.loadId || null,
      createdById: session.id,
      createdByName: session.name,
    },
  });
  await logActivity(session, "created", "fuel", body.state, `${gallons} gal · $${total}`);
  return NextResponse.json({ purchase });
}
