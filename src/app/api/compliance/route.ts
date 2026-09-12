import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { expiryStatus, daysUntil } from "@/lib/finance";

// Returns every tracked document with its expiry status, most urgent first.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "DRIVER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [drivers, trucks] = await Promise.all([
    prisma.driver.findMany(),
    prisma.truck.findMany(),
  ]);

  const items: any[] = [];
  const add = (
    entity: string,
    name: string,
    doc: string,
    date: Date | null
  ) => {
    if (!date) return;
    items.push({
      entity,
      name,
      doc,
      date,
      days: daysUntil(date),
      status: expiryStatus(date),
    });
  };

  for (const d of drivers) {
    add("driver", d.name, "CDL", d.cdlExpiry);
    add("driver", d.name, "Medical card", d.medicalExpiry);
  }
  for (const t of trucks) {
    add("truck", t.unitNumber, "Registration", t.registrationExpiry);
    add("truck", t.unitNumber, "DOT inspection", t.inspectionExpiry);
    add("truck", t.unitNumber, "Insurance", t.insuranceExpiry);
  }

  const order = { expired: 0, soon: 1, ok: 2, none: 3 } as any;
  items.sort((a, b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return (a.days ?? 0) - (b.days ?? 0);
  });

  return NextResponse.json({ items });
}
