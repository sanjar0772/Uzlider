import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, ROLES } from "@/lib/constants";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageUsers(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      driverId: true,
      driver: { select: { name: true } },
      createdAt: true,
    },
  });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageUsers(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.name || !body.email || !body.password || !body.role) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!ROLES.includes(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: String(body.email).toLowerCase().trim(),
        passwordHash: bcrypt.hashSync(body.password, 10),
        role: body.role,
        phone: body.phone || null,
        driverId: body.role === "DRIVER" && body.driverId ? body.driverId : null,
      },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json({ user });
  } catch (e: any) {
    if (e.code === "P2002")
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
