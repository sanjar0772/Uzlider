import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const drivers = await prisma.driver.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { loads: true } } },
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
      truckNumber: body.truckNumber || null,
      trailerNumber: body.trailerNumber || null,
      licenseNumber: body.licenseNumber || null,
      status: body.status || "AVAILABLE",
      notes: body.notes || null,
    },
  });
  return NextResponse.json({ driver });
}
