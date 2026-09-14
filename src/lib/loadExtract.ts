import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS } from "@/lib/finance";

// Shared post-processing for an AI-extracted load, used by both the board import
// API and the Telegram intake handler: match the broker to an existing customer,
// warn about likely duplicates, and flag loads whose rate is below target.

export type CustomerMatch = { id: string; name: string } | null;
export type DuplicateMatch = { id: string; refNumber: string; reason: "ref" | "lane" } | null;
export type ProfitCheck = { rpm: number; targetRpm: number; belowTarget: boolean } | null;

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|co|corp|logistics|transport|trucking|freight|brokerage|group)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Fuzzy-match an extracted broker name to an existing customer. Exact-ish match
// on a normalized name (company suffixes stripped) so "ABC Logistics LLC" and
// "ABC Logistics" resolve to the same record.
export async function matchCustomer(broker: string | null): Promise<CustomerMatch> {
  if (!broker || !broker.trim()) return null;
  const target = norm(broker);
  if (!target) return null;

  const customers = await prisma.customer.findMany({ select: { id: true, name: true } });
  let best: CustomerMatch = null;
  for (const c of customers) {
    const n = norm(c.name);
    if (!n) continue;
    if (n === target || n.includes(target) || target.includes(n)) {
      best = { id: c.id, name: c.name };
      if (n === target) break; // exact normalized match wins
    }
  }
  return best;
}

// Look for an existing load that this one likely duplicates: same reference
// number, or the same lane picking up on the same day.
export async function findDuplicate(x: {
  refNumber: string | null;
  origin: string | null;
  destination: string | null;
  pickupDate: string | null;
}): Promise<DuplicateMatch> {
  if (x.refNumber && x.refNumber.trim()) {
    const byRef = await prisma.load.findFirst({
      where: { refNumber: { equals: x.refNumber.trim(), mode: "insensitive" } },
      select: { id: true, refNumber: true },
    });
    if (byRef) return { ...byRef, reason: "ref" };
  }
  if (x.origin && x.destination && x.pickupDate) {
    const d = new Date(x.pickupDate);
    if (!isNaN(d.getTime())) {
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      const byLane = await prisma.load.findFirst({
        where: {
          origin: { equals: x.origin, mode: "insensitive" },
          destination: { equals: x.destination, mode: "insensitive" },
          pickupDate: { gte: start, lte: end },
        },
        select: { id: true, refNumber: true },
      });
      if (byLane) return { ...byLane, reason: "lane" };
    }
  }
  return null;
}

// Compare the load's rate-per-mile against the company target.
export async function profitCheck(
  rate: number | null,
  miles: number | null
): Promise<ProfitCheck> {
  if (!rate || !miles || miles <= 0) return null;
  const s = await prisma.companySettings.findFirst({ select: { targetRpm: true } });
  const targetRpm = s?.targetRpm ?? DEFAULT_SETTINGS.targetRpm;
  const rpm = rate / miles;
  return { rpm, targetRpm, belowTarget: rpm < targetRpm };
}

// Generate a fallback reference number for loads created without one (Telegram
// intake), so the unique refNumber constraint is always satisfied.
export function fallbackRef(prefix = "TG"): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}
