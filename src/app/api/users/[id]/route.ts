import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, ROLES } from "@/lib/constants";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageUsers(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.email !== undefined) data.email = String(body.email).toLowerCase().trim();
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.role !== undefined) {
    if (!ROLES.includes(body.role))
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    data.role = body.role;
  }
  if (body.driverId !== undefined) data.driverId = body.driverId || null;
  if (body.password) data.passwordHash = bcrypt.hashSync(body.password, 10);

  try {
    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json({ user });
  } catch (e: any) {
    if (e.code === "P2002")
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageUsers(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.id === params.id)
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
