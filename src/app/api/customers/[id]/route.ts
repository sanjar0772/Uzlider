import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageCustomers(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.contact !== undefined) data.contact = body.contact || null;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.mcNumber !== undefined) data.mcNumber = body.mcNumber || null;
  if (body.address !== undefined) data.address = body.address || null;
  if (body.notes !== undefined) data.notes = body.notes || null;

  const customer = await prisma.customer.update({ where: { id: params.id }, data });
  await logActivity(session, "updated", "customer", customer.name);
  return NextResponse.json({ customer });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageCustomers(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const customer = await prisma.customer.findUnique({ where: { id: params.id } });
  await prisma.load.updateMany({
    where: { customerId: params.id },
    data: { customerId: null },
  });
  await prisma.customer.delete({ where: { id: params.id } });
  await logActivity(session, "deleted", "customer", customer?.name);
  return NextResponse.json({ ok: true });
}
