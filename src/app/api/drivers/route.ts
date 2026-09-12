import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const drivers = await prisma.driver.findMany({
    orderBy: { name: "asc" },
    include: {
      truck: true,
      _count: { select: { loads: true } },
    },
  });
  return NextResponse.json({ drivers });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageDrivers(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const driver = await prisma.driver.create({
    data: {
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      truckNumber: body.truckNumber || null,
      trailerNumber: body.trailerNumber || null,
      licenseNumber: body.licenseNumber || null,
      status: body.status || "AVAILABLE",
      cdlExpiry: body.cdlExpiry ? new Date(body.cdlExpiry) : null,
      medicalExpiry: body.medicalExpiry ? new Date(body.medicalExpiry) : null,
      hireDate: body.hireDate ? new Date(body.hireDate) : null,
      availableHours:
        body.availableHours !== undefined && body.availableHours !== ""
          ? Number(body.availableHours)
          : 70,
      homeBase: body.homeBase || null,
      notes: body.notes || null,
    },
  });
  await logActivity(session, "created", "driver", driver.name);
  return NextResponse.json({ driver });
}
