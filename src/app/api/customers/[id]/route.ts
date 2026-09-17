import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { computePnl, CostSettings } from "@/lib/finance";

async function getSettings(): Promise<CostSettings> {
  let s = await prisma.companySettings.findFirst();
  if (!s) s = await prisma.companySettings.create({ data: { id: "company" } });
  return {
    mpg: s.mpg, fuelPricePerGallon: s.fuelPricePerGallon,
    fixedCostPerMile: s.fixedCostPerMile, targetRpm: s.targetRpm,
    factoringRatePct: s.factoringRatePct,
  };
}

// 360° customer account: revenue, loads, invoices and AR aging.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageCustomers(session.role) && !can.viewInvoices(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const customer = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await getSettings();
  const [loads, documents] = await Promise.all([
    prisma.load.findMany({ where: { customerId: params.id }, include: { driver: true, truck: true, invoice: true }, orderBy: { createdAt: "desc" } }),
    prisma.document.count({ where: { customerId: params.id } }),
  ]);

  const active = loads.filter((l) => l.status !== "CANCELLED");
  const revenue = active.reduce((s, l) => s + computePnl(l, settings, l.truck?.mpg ?? null).revenue, 0);
  const delivered = active.filter((l) => l.status === "DELIVERED").length;

  // AR aging on unpaid invoices, bucketed by days past due.
  const now = Date.now();
  const aging = { notDue: 0, d0_30: 0, d31_60: 0, d60plus: 0 };
  let outstanding = 0, paid = 0;
  for (const l of loads) {
    const inv = l.invoice;
    if (!inv) continue;
    if (inv.status === "PAID") { paid += inv.amount; continue; }
    outstanding += inv.amount;
    const due = inv.dueAt ? new Date(inv.dueAt).getTime() : null;
    if (due == null || due > now) aging.notDue += inv.amount;
    else {
      const days = Math.floor((now - due) / 86400000);
      if (days <= 30) aging.d0_30 += inv.amount;
      else if (days <= 60) aging.d31_60 += inv.amount;
      else aging.d60plus += inv.amount;
    }
  }

  return NextResponse.json({
    customer,
    loads,
    documentsCount: documents,
    metrics: {
      loadsCount: loads.length,
      delivered,
      revenue: Math.round(revenue),
      outstanding: Math.round(outstanding),
      paid: Math.round(paid),
    },
    aging: {
      notDue: Math.round(aging.notDue),
      d0_30: Math.round(aging.d0_30),
      d31_60: Math.round(aging.d31_60),
      d60plus: Math.round(aging.d60plus),
    },
  });
}

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
