import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isExpenseCategory } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageExpenses(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const data: any = {};
  if (body.date !== undefined) data.date = body.date ? new Date(body.date) : new Date();
  if (body.category !== undefined) {
    if (!isExpenseCategory(body.category))
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    data.category = body.category;
  }
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!amount || amount <= 0)
      return NextResponse.json({ error: "Amount required" }, { status: 400 });
    data.amount = amount;
  }
  if (body.description !== undefined) data.description = body.description || null;
  if (body.vendor !== undefined) data.vendor = body.vendor || null;
  if (body.truckId !== undefined) data.truckId = body.truckId || null;
  if (body.driverId !== undefined) data.driverId = body.driverId || null;
  if (body.loadId !== undefined) data.loadId = body.loadId || null;

  const expense = await prisma.expense.update({ where: { id: params.id }, data });
  await logActivity(session, "updated", "expense", expense.category);
  return NextResponse.json({ expense });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageExpenses(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.expense.delete({ where: { id: params.id } });
  await logActivity(session, "deleted", "expense");
  return NextResponse.json({ ok: true });
}
