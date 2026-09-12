import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Live fleet positions for dispatchers/managers. Returns every driver who has
// shared a position, with their status and current active load.
export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "DRIVER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const drivers = await prisma.driver.findMany({
    where: { lastLat: { not: null }, lastLng: { not: null } },
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      gpsEnabled: true,
      lastLat: true,
      lastLng: true,
      lastSpeed: true,
      lastHeading: true,
      lastLocationAt: true,
      truck: { select: { unitNumber: true } },
      loads: {
        where: { status: { in: ["ASSIGNED", "IN_TRANSIT"] } },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          refNumber: true,
          origin: true,
          destination: true,
          status: true,
        },
      },
    },
    orderBy: { lastLocationAt: "desc" },
  });

  const fleet = drivers.map((d) => ({
    id: d.id,
    name: d.name,
    phone: d.phone,
    status: d.status,
    gpsEnabled: d.gpsEnabled,
    lat: d.lastLat,
    lng: d.lastLng,
    speed: d.lastSpeed,
    heading: d.lastHeading,
    updatedAt: d.lastLocationAt,
    truck: d.truck?.unitNumber ?? null,
    currentLoad: d.loads[0] ?? null,
  }));

  return NextResponse.json({ fleet });
}
