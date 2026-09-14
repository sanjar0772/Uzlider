import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isExpenseCategory } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

// List expenses, newest first, with optional filters:
//   ?category=FUEL  ?truckId=..  ?driverId=..  ?loadId=..  ?from=..  ?to=..
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.viewExpenses(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const where: any = {};
  const category = searchParams.get("category");
  if (category && isExpenseCategory(category)) where.category = category;
  const truckId = searchParams.get("truckId");
  if (truckId) where.truckId = truckId;
  const driverId = searchParams.get("driverId");
  if (driverId) where.driverId = driverId;
  const loadId = searchParams.get("loadId");
  if (loadId) where.loadId = loadId;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to + "T23:59:59");
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: { truck: true, driver: true, load: true },
    orderBy: { date: "desc" },
  });

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory: Record<string, number> = {};
  for (const e of expenses) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;

  return NextResponse.json({ expenses, total, byCategory });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageExpenses(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const amount = Number(body.amount);
  if (!amount || amount <= 0)
    return NextResponse.json({ error: "Amount required" }, { status: 400 });
  if (body.category && !isExpenseCategory(body.category))
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });

  const expense = await prisma.expense.create({
    data: {
      date: body.date ? new Date(body.date) : new Date(),
      category: body.category || "OTHER",
      amount,
      description: body.description || null,
      vendor: body.vendor || null,
      truckId: body.truckId || null,
      driverId: body.driverId || null,
      loadId: body.loadId || null,
      createdById: session.id,
      createdByName: session.name,
    },
  });
  await logActivity(session, "created", "expense", body.category, `$${amount}`);
  return NextResponse.json({ expense });
}
