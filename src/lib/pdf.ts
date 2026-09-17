// Lightweight, dependency-free document generation. Each helper builds a clean
// printable HTML page and opens it in a new window with the print dialog —
// the user picks "Save as PDF". No server rendering, no external libraries.

import { money2, fmtDate } from "@/lib/format";

function openPrintable(title: string, bodyHtml: string) {
  const w = window.open("", "_blank", "width=880,height=1000");
  if (!w) {
    alert("Please allow pop-ups to generate the document.");
    return;
  }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 40px; }
  .doc { max-width: 720px; margin: 0 auto; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #3b66f5; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { font-size: 24px; font-weight: 800; color: #3b66f5; letter-spacing: -0.5px; }
  .brand small { display:block; font-size: 11px; font-weight: 600; color:#64748b; letter-spacing: 2px; text-transform: uppercase; }
  .doctype { text-align: right; }
  .doctype h1 { margin: 0; font-size: 22px; letter-spacing: 1px; text-transform: uppercase; color:#0f172a; }
  .doctype .ref { font-size: 13px; color:#64748b; margin-top:4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .box { background:#f8fafc; border:1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
  .box h3 { margin:0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color:#64748b; }
  .box .row { font-size: 14px; margin: 2px 0; }
  .box .big { font-size: 16px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 20px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color:#64748b; border-bottom: 2px solid #e2e8f0; padding: 8px 6px; }
  td { font-size: 14px; padding: 10px 6px; border-bottom: 1px solid #f1f5f9; }
  td.num, th.num { text-align: right; }
  .totals { margin-left: auto; width: 280px; }
  .totals .row { display:flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .totals .grand { border-top: 2px solid #0f172a; margin-top: 6px; padding-top: 10px; font-size: 18px; font-weight: 800; }
  .note { font-size: 12px; color:#64748b; margin-top: 24px; border-top:1px solid #e2e8f0; padding-top: 12px; }
  .sig { display:grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; }
  .sig .line { border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 12px; color:#64748b; }
  .badge { display:inline-block; background:#eff3ff; color:#3b66f5; font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; }
  @media print { body { padding: 0; } .doc { max-width: none; } }
</style></head><body onload="window.print()"><div class="doc">${bodyHtml}</div></body></html>`);
  w.document.close();
}

function escapeHtml(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function header(company: string, docType: string, ref: string) {
  return `<div class="head">
    <div class="brand">${escapeHtml(company)}<small>Uzlider TMS</small></div>
    <div class="doctype"><h1>${escapeHtml(docType)}</h1><div class="ref">${escapeHtml(ref)}</div></div>
  </div>`;
}

type AnyLoad = any;

export function printRateConfirmation(load: AnyLoad, company = "Uzlider Trucking") {
  const stops = (load.stops ?? []) as any[];
  const stopRows = stops.length
    ? stops.map((s) => `<tr><td>${escapeHtml(s.type)}</td><td>${escapeHtml(s.location)}</td><td>${escapeHtml(s.scheduledAt ? fmtDate(s.scheduledAt) : "—")}</td></tr>`).join("")
    : `<tr><td>PICKUP</td><td>${escapeHtml(load.origin)}</td><td>${escapeHtml(load.pickupDate ? fmtDate(load.pickupDate) : "—")}</td></tr>
       <tr><td>DROPOFF</td><td>${escapeHtml(load.destination)}</td><td>${escapeHtml(load.deliveryDate ? fmtDate(load.deliveryDate) : "—")}</td></tr>`;

  const accessorials: string[] = [];
  if (load.detention) accessorials.push(`<div class="totals row"><span>Detention</span><span>${money2(load.detention)}</span></div>`);
  if (load.lumperFee) accessorials.push(`<div class="totals row"><span>Lumper</span><span>${money2(load.lumperFee)}</span></div>`);
  if (load.otherCharges) accessorials.push(`<div class="totals row"><span>Other</span><span>${money2(load.otherCharges)}</span></div>`);
  const total = (load.rate ?? 0) + (load.detention ?? 0) + (load.otherCharges ?? 0);

  const body = `
  ${header(company, "Rate Confirmation", load.refNumber)}
  <div class="grid">
    <div class="box"><h3>Carrier / Driver</h3>
      <div class="row big">${escapeHtml(load.driver?.name ?? "Unassigned")}</div>
      <div class="row">Truck: ${escapeHtml(load.truck?.unitNumber ?? "—")}</div>
      <div class="row">Equipment: ${escapeHtml(load.equipment ?? "—")}</div>
    </div>
    <div class="box"><h3>Broker / Customer</h3>
      <div class="row big">${escapeHtml(load.customer?.name ?? load.broker ?? "—")}</div>
      <div class="row">Commodity: ${escapeHtml(load.commodity ?? "—")}</div>
      <div class="row">Weight: ${load.weight ? escapeHtml(load.weight.toLocaleString()) + " lbs" : "—"}</div>
    </div>
  </div>
  <table><thead><tr><th>Stop</th><th>Location</th><th>Date</th></tr></thead><tbody>${stopRows}</tbody></table>
  <div class="totals">
    <div class="row"><span>Line haul (${load.miles ?? "—"} mi)</span><span>${money2(load.rate ?? 0)}</span></div>
    ${accessorials.join("")}
    <div class="row grand"><span>Total</span><span>${money2(total)}</span></div>
  </div>
  ${load.notes ? `<div class="note"><strong>Notes:</strong> ${escapeHtml(load.notes)}</div>` : ""}
  <div class="sig"><div class="line">Carrier signature / date</div><div class="line">Broker signature / date</div></div>
  <div class="note">This rate confirmation is subject to the terms of the carrier–broker agreement.</div>`;
  openPrintable(`RateCon ${load.refNumber}`, body);
}

export function printDispatchSheet(load: AnyLoad, company = "Uzlider Trucking") {
  const stops = (load.stops ?? []) as any[];
  const stopRows = stops.length
    ? stops.map((s, i) => `<tr><td>${i + 1}. ${escapeHtml(s.type)}</td><td>${escapeHtml(s.location)}</td><td>${escapeHtml(s.scheduledAt ? fmtDate(s.scheduledAt) : "—")}</td><td>${escapeHtml(s.contact ?? "—")}</td></tr>`).join("")
    : `<tr><td>1. PICKUP</td><td>${escapeHtml(load.origin)}</td><td>${escapeHtml(load.pickupDate ? fmtDate(load.pickupDate) : "—")}</td><td>—</td></tr>
       <tr><td>2. DROPOFF</td><td>${escapeHtml(load.destination)}</td><td>${escapeHtml(load.deliveryDate ? fmtDate(load.deliveryDate) : "—")}</td><td>—</td></tr>`;
  const body = `
  ${header(company, "Dispatch Sheet", load.refNumber)}
  <div class="grid">
    <div class="box"><h3>Driver</h3>
      <div class="row big">${escapeHtml(load.driver?.name ?? "Unassigned")}</div>
      <div class="row">Phone: ${escapeHtml(load.driver?.phone ?? "—")}</div>
      <div class="row">Truck: ${escapeHtml(load.truck?.unitNumber ?? "—")}</div>
    </div>
    <div class="box"><h3>Load</h3>
      <div class="row big">${escapeHtml(load.customer?.name ?? load.broker ?? "—")}</div>
      <div class="row">Miles: ${escapeHtml(load.miles ?? "—")} · DH: ${escapeHtml(load.deadheadMiles ?? 0)}</div>
      <div class="row">Driver pay: ${money2(load.driverPay ?? 0)}</div>
    </div>
  </div>
  <table><thead><tr><th>Stop</th><th>Location</th><th>Date</th><th>Contact</th></tr></thead><tbody>${stopRows}</tbody></table>
  ${load.commodity || load.weight ? `<div class="box"><h3>Freight</h3><div class="row">${escapeHtml(load.commodity ?? "—")} · ${load.weight ? escapeHtml(load.weight.toLocaleString()) + " lbs" : "—"} · ${escapeHtml(load.equipment ?? "")}</div></div>` : ""}
  ${load.notes ? `<div class="note"><strong>Dispatch notes:</strong> ${escapeHtml(load.notes)}</div>` : ""}
  <div class="note">Call dispatch with every status change. Get signed BOL/POD at each stop.</div>`;
  openPrintable(`Dispatch ${load.refNumber}`, body);
}

export function printSettlement(
  driver: AnyLoad,
  settlement: { grossPay: number; deductions: number; netPay: number },
  loads: any[],
  period: { from: string; to: string } | null,
  company = "Uzlider Trucking"
) {
  const rows = (loads ?? [])
    .filter((l) => l.status === "DELIVERED")
    .map((l) => `<tr><td>${escapeHtml(l.refNumber)}</td><td>${escapeHtml(l.origin)} → ${escapeHtml(l.destination)}</td><td>${escapeHtml(l.deliveryDate ? fmtDate(l.deliveryDate) : "—")}</td><td class="num">${money2(l.driverPay ?? 0)}</td></tr>`)
    .join("");
  const body = `
  ${header(company, "Settlement", driver.name)}
  <div class="grid">
    <div class="box"><h3>Driver</h3>
      <div class="row big">${escapeHtml(driver.name)}</div>
      <div class="row">${escapeHtml(driver.phone ?? "")}</div>
    </div>
    <div class="box"><h3>Pay period</h3>
      <div class="row">${period ? `${escapeHtml(period.from)} → ${escapeHtml(period.to)}` : "All time"}</div>
    </div>
  </div>
  <table><thead><tr><th>Load</th><th>Lane</th><th>Delivered</th><th class="num">Driver pay</th></tr></thead><tbody>${rows || `<tr><td colspan="4">No delivered loads in this period.</td></tr>`}</tbody></table>
  <div class="totals">
    <div class="row"><span>Gross pay</span><span>${money2(settlement.grossPay)}</span></div>
    <div class="row"><span>Deductions</span><span>−${money2(settlement.deductions)}</span></div>
    <div class="row grand"><span>Net pay</span><span>${money2(settlement.netPay)}</span></div>
  </div>
  <div class="sig"><div class="line">Driver signature / date</div><div class="line">Authorized by / date</div></div>`;
  openPrintable(`Settlement ${driver.name}`, body);
}

export function printStatement(
  customer: AnyLoad,
  data: { loads: any[]; metrics: any; aging: any },
  company = "Uzlider Trucking"
) {
  const invoiced = (data.loads ?? []).filter((l) => l.invoice);
  const rows = invoiced
    .map((l) => {
      const inv = l.invoice;
      return `<tr><td>${escapeHtml(inv.number)}</td><td>${escapeHtml(l.refNumber)}</td><td>${escapeHtml(inv.dueAt ? fmtDate(inv.dueAt) : "—")}</td><td>${escapeHtml(inv.status)}</td><td class="num">${money2(inv.amount)}</td></tr>`;
    })
    .join("");
  const a = data.aging;
  const body = `
  ${header(company, "Statement", customer.name)}
  <div class="grid">
    <div class="box"><h3>Bill to</h3>
      <div class="row big">${escapeHtml(customer.name)}</div>
      ${customer.contact ? `<div class="row">${escapeHtml(customer.contact)}</div>` : ""}
      ${customer.mcNumber ? `<div class="row">MC# ${escapeHtml(customer.mcNumber)}</div>` : ""}
    </div>
    <div class="box"><h3>Account summary</h3>
      <div class="row">Revenue: ${money2(data.metrics.revenue)}</div>
      <div class="row">Paid: ${money2(data.metrics.paid)}</div>
      <div class="row big">Outstanding: ${money2(data.metrics.outstanding)}</div>
    </div>
  </div>
  <table><thead><tr><th>Invoice</th><th>Load</th><th>Due</th><th>Status</th><th class="num">Amount</th></tr></thead><tbody>${rows || `<tr><td colspan="5">No invoices on file.</td></tr>`}</tbody></table>
  <div class="totals">
    <div class="row"><span>Current / not due</span><span>${money2(a.notDue)}</span></div>
    <div class="row"><span>0–30 days</span><span>${money2(a.d0_30)}</span></div>
    <div class="row"><span>31–60 days</span><span>${money2(a.d31_60)}</span></div>
    <div class="row"><span>60+ days</span><span>${money2(a.d60plus)}</span></div>
    <div class="row grand"><span>Total outstanding</span><span>${money2(data.metrics.outstanding)}</span></div>
  </div>
  <div class="note">Please remit outstanding balances. Contact us with any questions about this statement.</div>`;
  openPrintable(`Statement ${customer.name}`, body);
}

export function printInvoice(invoice: AnyLoad, company = "Uzlider Trucking") {
  const load = invoice.load ?? {};
  const rows: string[] = [];
  rows.push(`<tr><td>Line haul — ${escapeHtml(load.origin ?? "")} → ${escapeHtml(load.destination ?? "")} (${load.miles ?? "—"} mi)</td><td class="num">${money2(load.rate ?? invoice.amount)}</td></tr>`);
  if (load.detention) rows.push(`<tr><td>Detention</td><td class="num">${money2(load.detention)}</td></tr>`);
  if (load.lumperFee) rows.push(`<tr><td>Lumper</td><td class="num">${money2(load.lumperFee)}</td></tr>`);
  if (load.otherCharges) rows.push(`<tr><td>Other charges</td><td class="num">${money2(load.otherCharges)}</td></tr>`);

  const body = `
  ${header(company, "Invoice", invoice.number)}
  <div class="grid">
    <div class="box"><h3>Bill to</h3>
      <div class="row big">${escapeHtml(load.customer?.name ?? load.broker ?? "—")}</div>
      <div class="row">Load ${escapeHtml(load.refNumber ?? "")}</div>
    </div>
    <div class="box"><h3>Invoice details</h3>
      <div class="row">Issued: ${escapeHtml(invoice.issuedAt ? fmtDate(invoice.issuedAt) : fmtDate(invoice.createdAt))}</div>
      <div class="row">Due: ${escapeHtml(invoice.dueAt ? fmtDate(invoice.dueAt) : "—")}</div>
      <div class="row"><span class="badge">${escapeHtml(invoice.status)}</span></div>
    </div>
  </div>
  <table><thead><tr><th>Description</th><th class="num">Amount</th></tr></thead><tbody>${rows.join("")}</tbody></table>
  <div class="totals"><div class="row grand"><span>Total due</span><span>${money2(invoice.amount)}</span></div></div>
  ${invoice.notes ? `<div class="note"><strong>Notes:</strong> ${escapeHtml(invoice.notes)}</div>` : ""}
  <div class="note">Remit payment by the due date. Reference invoice ${escapeHtml(invoice.number)} on all payments. Thank you for your business.</div>`;
  openPrintable(`Invoice ${invoice.number}`, body);
}
