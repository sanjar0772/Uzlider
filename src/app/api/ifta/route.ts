import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";

// IFTA-style fuel summary: gallons & spend by jurisdiction for a quarter.
// Query: ?year=2026&quarter=1  (defaults to the current quarter)
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.viewFuel(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = Number(searchParams.get("year")) || now.getFullYear();
  const quarter = Number(searchParams.get("quarter")) || Math.floor(now.getMonth() / 3) + 1;
  const q = Math.min(4, Math.max(1, quarter));

  const start = new Date(year, (q - 1) * 3, 1);
  const end = new Date(year, q * 3, 1);

  const purchases = await prisma.fuelPurchase.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
  });

  const byState: Record<string, { state: string; gallons: number; cost: number; stops: number }> = {};
  let totalGallons = 0;
  let totalCost = 0;
  let unassigned = 0;
  for (const p of purchases) {
    totalGallons += p.gallons;
    totalCost += p.total;
    const key = p.state || "—";
    if (p.state == null) unassigned++;
    if (!byState[key]) byState[key] = { state: key, gallons: 0, cost: 0, stops: 0 };
    byState[key].gallons += p.gallons;
    byState[key].cost += p.total;
    byState[key].stops += 1;
  }

  const jurisdictions = Object.values(byState)
    .map((s) => ({
      state: s.state,
      gallons: Number(s.gallons.toFixed(1)),
      cost: Math.round(s.cost),
      stops: s.stops,
      avgPrice: s.gallons > 0 ? Number((s.cost / s.gallons).toFixed(3)) : 0,
    }))
    .sort((a, b) => b.gallons - a.gallons);

  return NextResponse.json({
    year,
    quarter: q,
    period: { from: start.toISOString().slice(0, 10), to: new Date(end.getTime() - 1).toISOString().slice(0, 10) },
    jurisdictions,
    totals: {
      gallons: Number(totalGallons.toFixed(1)),
      cost: Math.round(totalCost),
      stops: purchases.length,
      avgPrice: totalGallons > 0 ? Number((totalCost / totalGallons).toFixed(3)) : 0,
      unassignedStops: unassigned,
    },
  });
}
