import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { loads: true } } },
  });
  return NextResponse.json({ customers });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageCustomers(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const customer = await prisma.customer.create({
    data: {
      name: body.name,
      contact: body.contact || null,
      email: body.email || null,
      phone: body.phone || null,
      mcNumber: body.mcNumber || null,
      address: body.address || null,
      notes: body.notes || null,
    },
  });
  await logActivity(session, "created", "customer", customer.name);
  return NextResponse.json({ customer });
}
