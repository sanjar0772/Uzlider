import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession, createSession } from "@/lib/auth";

// Update own name / phone
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: any = {};
  if (body.name !== undefined && body.name.trim()) data.name = body.name.trim();
  if (body.phone !== undefined) data.phone = body.phone || null;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const user = await prisma.user.update({ where: { id: session.id }, data });
  // Refresh the session cookie so the new name shows immediately.
  await createSession({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    driverId: user.driverId,
  });
  return NextResponse.json({ ok: true });
}

// Change own password
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (String(newPassword).length < 6)
    return NextResponse.json({ error: "Password too short" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return NextResponse.json({ error: "WRONG_PASSWORD" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.id },
    data: { passwordHash: bcrypt.hashSync(newPassword, 10) },
  });
  return NextResponse.json({ ok: true });
}
