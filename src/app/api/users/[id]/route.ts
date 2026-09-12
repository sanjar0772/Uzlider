import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, ROLES, ROLE_RANK } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageUsers(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // You may not act on an account that outranks you (a Manager cannot touch an Owner).
  if (ROLE_RANK[target.role] > ROLE_RANK[session.role]) {
    return NextResponse.json(
      { error: "Cannot modify a user with a higher role" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.email !== undefined) data.email = String(body.email).toLowerCase().trim();
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.role !== undefined && body.role !== target.role) {
    if (!ROLES.includes(body.role))
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    // Cannot grant a role above your own.
    if (ROLE_RANK[body.role] > ROLE_RANK[session.role])
      return NextResponse.json(
        { error: "Cannot assign a role above your own" },
        { status: 403 }
      );
    // Never demote the last remaining Owner (would lock everyone out of admin).
    if (target.role === "OWNER" && body.role !== "OWNER") {
      const owners = await prisma.user.count({ where: { role: "OWNER" } });
      if (owners <= 1)
        return NextResponse.json(
          { error: "Cannot demote the last Owner" },
          { status: 400 }
        );
    }
    data.role = body.role;
  }
  if (body.driverId !== undefined) data.driverId = body.driverId || null;
  if (body.password) {
    if (typeof body.password !== "string" || body.password.length < 6)
      return NextResponse.json({ error: "Password too short" }, { status: 400 });
    data.passwordHash = bcrypt.hashSync(body.password, 10);
  }

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

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ROLE_RANK[target.role] > ROLE_RANK[session.role])
    return NextResponse.json(
      { error: "Cannot delete a user with a higher role" },
      { status: 403 }
    );
  if (target.role === "OWNER") {
    const owners = await prisma.user.count({ where: { role: "OWNER" } });
    if (owners <= 1)
      return NextResponse.json(
        { error: "Cannot delete the last Owner" },
        { status: 400 }
      );
  }

  await prisma.user.delete({ where: { id: params.id } });
  await logActivity(session, "deleted", "user", target.name);
  return NextResponse.json({ ok: true });
}
