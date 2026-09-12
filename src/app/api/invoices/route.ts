import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isInvoiceStatus } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.viewInvoices(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { load: { include: { customer: true } } },
  });
  return NextResponse.json({ invoices });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageInvoices(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.loadId)
    return NextResponse.json({ error: "Load required" }, { status: 400 });
  if (body.status && !isInvoiceStatus(body.status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const load = await prisma.load.findUnique({
    where: { id: body.loadId },
    include: { invoice: true },
  });
  if (!load) return NextResponse.json({ error: "Load not found" }, { status: 404 });
  if (load.invoice)
    return NextResponse.json(
      { error: "Load already invoiced" },
      { status: 409 }
    );

  const number =
    body.number?.trim() ||
    `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  try {
    const invoice = await prisma.invoice.create({
      data: {
        number,
        loadId: body.loadId,
        amount: body.amount ? Number(body.amount) : load.rate ?? 0,
        status: body.status || "DRAFT",
        issuedAt: body.issuedAt ? new Date(body.issuedAt) : new Date(),
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        notes: body.notes || null,
      },
    });
    await logActivity(session, "created", "invoice", invoice.number);
    return NextResponse.json({ invoice });
  } catch (e: any) {
    if (e.code === "P2002")
      return NextResponse.json({ error: "Invoice # exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
