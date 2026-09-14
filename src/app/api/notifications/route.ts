import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";
import { expiryStatus, computePnl, CostSettings } from "@/lib/finance";

type Alert = {
  key: string;
  tone: "danger" | "warning" | "info" | "success";
  title: string;
  href: string;
};

async function getSettings(): Promise<CostSettings> {
  let s = await prisma.companySettings.findFirst();
  if (!s) s = await prisma.companySettings.create({ data: { id: "company" } });
  return {
    mpg: s.mpg, fuelPricePerGallon: s.fuelPricePerGallon,
    fixedCostPerMile: s.fixedCostPerMile, targetRpm: s.targetRpm,
    factoringRatePct: s.factoringRatePct,
  };
}

// Live operational alert feed, computed on demand from current state.
// Titles are i18n keys/values assembled client-side; here we send a compact,
// language-neutral payload the bell menu renders.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alerts: Alert[] = [];
  const role = session.role;

  if (role !== "DRIVER") {
    const settings = await getSettings();
    const [drivers, trucks, loads, invoices, maintenance] = await Promise.all([
      prisma.driver.findMany(),
      prisma.truck.findMany(),
      prisma.load.findMany({ include: { truck: true } }),
      can.viewInvoices(role) ? prisma.invoice.findMany() : Promise.resolve([]),
      prisma.maintenanceRecord.findMany({ where: { nextServiceDate: { not: null } }, include: { truck: true } }),
    ]);

    // Compliance expiries
    let expired = 0, soon = 0;
    const check = (d: any) => {
      const st = expiryStatus(d);
      if (st === "expired") expired++;
      else if (st === "soon") soon++;
    };
    for (const d of drivers) { check(d.cdlExpiry); check(d.medicalExpiry); }
    for (const t of trucks) { check(t.registrationExpiry); check(t.inspectionExpiry); check(t.insuranceExpiry); }
    if (expired > 0)
      alerts.push({ key: `compliance_expired:${expired}`, tone: "danger", title: `${expired}::expired::compliance`, href: "/dashboard/compliance" });
    if (soon > 0)
      alerts.push({ key: `compliance_soon:${soon}`, tone: "warning", title: `${soon}::expiringSoon::compliance`, href: "/dashboard/compliance" });

    // Unassigned loads
    const unassigned = loads.filter((l) => !l.driverId && l.status !== "CANCELLED" && l.status !== "DELIVERED").length;
    if (unassigned > 0)
      alerts.push({ key: `unassigned:${unassigned}`, tone: "info", title: `${unassigned}::unassignedLoads::`, href: "/dashboard/board" });

    // Overdue invoices
    if (can.viewInvoices(role)) {
      const nowMs = Date.now();
      const overdue = (invoices as any[]).filter((i) => i.status !== "PAID" && i.dueAt && new Date(i.dueAt).getTime() < nowMs).length;
      if (overdue > 0)
        alerts.push({ key: `overdue:${overdue}`, tone: "danger", title: `${overdue}::OVERDUE::invoices`, href: "/dashboard/invoices" });
    }

    // Maintenance due
    if (can.viewMaintenance(role)) {
      const nowMs = Date.now();
      const due = (maintenance as any[]).filter((m) => m.nextServiceDate && new Date(m.nextServiceDate).getTime() - nowMs <= 30 * 86400000).length;
      if (due > 0)
        alerts.push({ key: `maint:${due}`, tone: "warning", title: `${due}::maintenanceDue::maintenance`, href: "/dashboard/maintenance" });
    }

    // Loss-making loads (negative margin), financial roles only
    if (can.viewFinancials(role)) {
      let losing = 0;
      for (const l of loads) {
        if (l.status === "CANCELLED") continue;
        if ((l.rate ?? 0) <= 0) continue;
        const p = computePnl(l, settings, l.truck?.mpg ?? null);
        if (p.netProfit < 0) losing++;
      }
      if (losing > 0)
        alerts.push({ key: `losing:${losing}`, tone: "danger", title: `${losing}::negativeMargin::loads`, href: "/dashboard/loads" });
    }
  } else {
    // Driver: their current load, and their own expiring documents.
    const driverId = session.driverId ?? "__none__";
    const [driver, active] = await Promise.all([
      prisma.driver.findUnique({ where: { id: driverId } }),
      prisma.load.findFirst({ where: { driverId, status: { in: ["ASSIGNED", "IN_TRANSIT"] } } }),
    ]);
    if (driver) {
      if (expiryStatus(driver.cdlExpiry) === "expired" || expiryStatus(driver.medicalExpiry) === "expired")
        alerts.push({ key: "my_docs_expired", tone: "danger", title: `1::expired::compliance`, href: "/dashboard/profile" });
      else if (expiryStatus(driver.cdlExpiry) === "soon" || expiryStatus(driver.medicalExpiry) === "soon")
        alerts.push({ key: "my_docs_soon", tone: "warning", title: `1::expiringSoon::compliance`, href: "/dashboard/profile" });
    }
    if (active)
      alerts.push({ key: `active:${active.id}`, tone: "info", title: `1::activeLoads::`, href: `/dashboard/loads/${active.id}` });
  }

  return NextResponse.json({ alerts });
}
