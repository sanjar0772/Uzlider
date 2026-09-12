import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// A driver's own device reports its GPS position here (called periodically by
// the browser geolocation tracker). Staff/managers linked to a driver profile
// can report too. We store the latest position on the Driver row and append a
// breadcrumb to LocationPing for the trail.

function resolveDriverId(session: { role: string; driverId?: string | null }) {
  return session.driverId ?? null;
}

// GET — the current driver's sharing state + last known position (for the UI).
export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const driverId = resolveDriverId(session);
  if (!driverId)
    return NextResponse.json({ error: "No driver profile" }, { status: 404 });

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: {
      gpsEnabled: true,
      lastLat: true,
      lastLng: true,
      lastLocationAt: true,
    },
  });
  if (!driver)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ location: driver });
}

// POST — record a new GPS position for the signed-in driver.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const driverId = resolveDriverId(session);
  if (!driverId)
    return NextResponse.json({ error: "No driver profile" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });

  const speed =
    body.speed !== undefined && body.speed !== null && Number.isFinite(Number(body.speed))
      ? Number(body.speed)
      : null;
  const heading =
    body.heading !== undefined && body.heading !== null && Number.isFinite(Number(body.heading))
      ? Number(body.heading)
      : null;

  await prisma.driver.update({
    where: { id: driverId },
    data: {
      gpsEnabled: true,
      lastLat: lat,
      lastLng: lng,
      lastSpeed: speed,
      lastHeading: heading,
      lastLocationAt: new Date(),
    },
  });

  await prisma.locationPing.create({
    data: { driverId, lat, lng, speed, heading },
  });

  return NextResponse.json({ ok: true });
}

// PATCH — toggle location sharing on/off for the signed-in driver.
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const driverId = resolveDriverId(session);
  if (!driverId)
    return NextResponse.json({ error: "No driver profile" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const enabled = Boolean(body.enabled);

  await prisma.driver.update({
    where: { id: driverId },
    data: { gpsEnabled: enabled },
  });

  return NextResponse.json({ ok: true, gpsEnabled: enabled });
}
