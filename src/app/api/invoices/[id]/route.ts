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
  if (!can.manageInvoices(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const data: any = {};
  if (body.number !== undefined) data.number = body.number;
  if (body.amount !== undefined) data.amount = Number(body.amount);
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "PAID") data.paidAt = new Date();
  }
  if (body.issuedAt !== undefined)
    data.issuedAt = body.issuedAt ? new Date(body.issuedAt) : null;
  if (body.dueAt !== undefined) data.dueAt = body.dueAt ? new Date(body.dueAt) : null;
  if (body.paidAt !== undefined)
    data.paidAt = body.paidAt ? new Date(body.paidAt) : null;
  if (body.notes !== undefined) data.notes = body.notes || null;

  try {
    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data,
    });
    await logActivity(
      session,
      body.status ? "status_changed" : "updated",
      "invoice",
      invoice.number,
      body.status ? `→ ${body.status}` : null
    );
    return NextResponse.json({ invoice });
  } catch (e: any) {
    if (e.code === "P2002")
      return NextResponse.json({ error: "Invoice # exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageInvoices(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
  await prisma.invoice.delete({ where: { id: params.id } });
  await logActivity(session, "deleted", "invoice", invoice?.number);
  return NextResponse.json({ ok: true });
}
