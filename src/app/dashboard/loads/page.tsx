"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Eye, RefreshCw, Pencil, Trash2, Package } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import {
  can,
  LOAD_STATUSES,
  LOAD_STATUS_COLORS,
  EQUIPMENT_TYPES,
} from "@/lib/constants";
import { money, money2, fmtDate, fmtDateTime } from "@/lib/format";
import { computePnl, rpmBg, DEFAULT_SETTINGS, CostSettings } from "@/lib/finance";
import Modal from "@/components/Modal";
import { PageHeader, TableSkeleton, EmptyState } from "@/components/ui";

const empty = {
  refNumber: "", origin: "", destination: "", pickupDate: "", deliveryDate: "",
  rate: "", driverPay: "", miles: "", deadheadMiles: "", detention: "", lumperFee: "",
  otherCharges: "", weight: "", commodity: "", equipment: "VAN",
  status: "NEW", customerId: "", driverId: "", truckId: "", notes: "",
};

export default function LoadsPage() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [role, setRole] = useState("");
  const [loads, setLoads] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [settings, setSettings] = useState<CostSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...empty });
  const [formError, setFormError] = useState("");
  const [updateFor, setUpdateFor] = useState<any>(null);
  const [viewFor, setViewFor] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    const res = await fetch("/api/loads?" + params.toString()).then((r) => r.json());
    setLoads(res.loads ?? []);
    setLoading(false);
  }, [q, statusFilter]);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setRole(me.user?.role ?? "");
      if (me.user?.role !== "DRIVER") {
        const [dr, tr, cu, st] = await Promise.all([
          fetch("/api/drivers").then((r) => r.json()),
          fetch("/api/trucks").then((r) => r.json()),
          fetch("/api/customers").then((r) => r.json()),
          fetch("/api/settings").then((r) => r.json()),
        ]);
        setDrivers(dr.drivers ?? []);
        setTrucks(tr.trucks ?? []);
        setCustomers(cu.customers ?? []);
        if (st.settings) setSettings(st.settings);
      }
    })();
  }, []);

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  const canCreate = can.createLoad(role);
  const canEdit = can.editLoad(role);
  const canDelete = can.deleteLoad(role);
  const canUpdate = can.updateStatus(role);
  const showFin = can.viewFinancials(role);

  function openCreate() {
    setEditing(null);
    setForm({ ...empty });
    setFormError("");
    setFormOpen(true);
  }
  function openEdit(l: any) {
    setEditing(l);
    setForm({
      refNumber: l.refNumber, origin: l.origin, destination: l.destination,
      pickupDate: l.pickupDate ? l.pickupDate.slice(0, 10) : "",
      deliveryDate: l.deliveryDate ? l.deliveryDate.slice(0, 10) : "",
      rate: l.rate?.toString() ?? "", driverPay: l.driverPay?.toString() ?? "",
      miles: l.miles?.toString() ?? "", deadheadMiles: l.deadheadMiles?.toString() ?? "",
      detention: l.detention?.toString() ?? "", lumperFee: l.lumperFee?.toString() ?? "",
      otherCharges: l.otherCharges?.toString() ?? "",
      weight: l.weight?.toString() ?? "",
      commodity: l.commodity ?? "", equipment: l.equipment ?? "VAN",
      status: l.status, customerId: l.customerId ?? "", driverId: l.driverId ?? "",
      truckId: l.truckId ?? "", notes: l.notes ?? "",
    });
    setFormError("");
    setFormOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const url = editing ? `/api/loads/${editing.id}` : "/api/loads";
    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setFormOpen(false);
      toast.success(editing ? t("updatedOk") : t("createdOk"));
      load();
    } else {
      const d = await res.json();
      setFormError(d.error ?? t("somethingWrong"));
    }
  }

  async function remove(l: any) {
    const ok = await confirm({ message: t("confirmDelete"), danger: true, confirmText: t("delete") });
    if (!ok) return;
    await fetch(`/api/loads/${l.id}`, { method: "DELETE" });
    toast.success(t("deletedOk"));
    load();
  }

  async function openView(l: any) {
    setViewFor(l);
    const res = await fetch(`/api/loads/${l.id}`).then((r) => r.json());
    setHistory(res.load?.updates ?? []);
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("loads")} subtitle={`${loads.length} ${t("total").toLowerCase()}`}>
        {canCreate && (
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> {t("newLoad")}
          </button>
        )}
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <div className="relative max-w-xs flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input max-w-[180px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="ALL">{t("all")}</option>
          {LOAD_STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="th">{t("refNumber")}</th>
                <th className="th">{t("origin")} → {t("destination")}</th>
                <th className="th">{t("customer")}</th>
                <th className="th">{t("driver")}</th>
                {showFin && <th className="th">{t("rate")}</th>}
                <th className="th">{t("status")}</th>
                <th className="th text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loads.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="td">
                    <div className="font-medium text-slate-900 dark:text-white">{l.refNumber}</div>
                    <div className="text-xs text-slate-400">{t(l.equipment)}</div>
                  </td>
                  <td className="td">
                    <div>{l.origin}</div>
                    <div className="text-slate-400">→ {l.destination}</div>
                  </td>
                  <td className="td">{l.customer?.name ?? l.broker ?? "—"}</td>
                  <td className="td">{l.driver?.name ?? <span className="text-slate-400">{t("unassigned")}</span>}</td>
                  {showFin && (
                    <td className="td">
                      <div className="font-medium tabular-nums">{money(l.rate)}</div>
                      {l.rate && l.miles ? (
                        <span className={`badge mt-0.5 ${rpmBg(l.rate / l.miles, settings.targetRpm)}`}>
                          ${(l.rate / l.miles).toFixed(2)}{t("perMile")}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  )}
                  <td className="td"><span className={`badge ${LOAD_STATUS_COLORS[l.status]}`}>{t(l.status)}</span></td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openView(l)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" title={t("view")}><Eye size={15} /></button>
                      {canUpdate && <button onClick={() => setUpdateFor(l)} className="rounded p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10" title={t("addUpdate")}><RefreshCw size={15} /></button>}
                      {canEdit && <button onClick={() => openEdit(l)} className="rounded p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10" title={t("edit")}><Pencil size={15} /></button>}
                      {canDelete && <button onClick={() => remove(l)} className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" title={t("delete")}><Trash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <TableSkeleton cols={showFin ? 7 : 6} />}
          {!loading && loads.length === 0 && <EmptyState icon={Package} title={t("noData")} />}
        </div>
      </div>

      {formOpen && (
        <Modal title={editing ? t("editLoad") : t("newLoad")} onClose={() => setFormOpen(false)} wide>
          <form onSubmit={submitForm} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={`${t("refNumber")} *`}><input className="input" value={form.refNumber} onChange={(e) => setForm({ ...form, refNumber: e.target.value })} required /></Field>
              <Field label={t("customer")}>
                <select className="input" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                  <option value="">—</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label={`${t("origin")} *`}><input className="input" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} required /></Field>
              <Field label={`${t("destination")} *`}><input className="input" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required /></Field>
              <Field label={t("pickupDate")}><input type="date" className="input" value={form.pickupDate} onChange={(e) => setForm({ ...form, pickupDate: e.target.value })} /></Field>
              <Field label={t("deliveryDate")}><input type="date" className="input" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} /></Field>
              <Field label={`${t("rate")} ($)`}><input type="number" className="input" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></Field>
              <Field label={`${t("driverPay")} ($)`}><input type="number" className="input" value={form.driverPay} onChange={(e) => setForm({ ...form, driverPay: e.target.value })} /></Field>
              <Field label={t("miles")}><input type="number" className="input" value={form.miles} onChange={(e) => setForm({ ...form, miles: e.target.value })} /></Field>
              <Field label={t("deadheadMiles")}><input type="number" className="input" value={form.deadheadMiles} onChange={(e) => setForm({ ...form, deadheadMiles: e.target.value })} /></Field>
              <Field label={`${t("detention")} ($)`}><input type="number" className="input" value={form.detention} onChange={(e) => setForm({ ...form, detention: e.target.value })} /></Field>
              <Field label={`${t("lumper")} ($)`}><input type="number" className="input" value={form.lumperFee} onChange={(e) => setForm({ ...form, lumperFee: e.target.value })} /></Field>
              <Field label={`${t("otherCharges")} ($)`}><input type="number" className="input" value={form.otherCharges} onChange={(e) => setForm({ ...form, otherCharges: e.target.value })} /></Field>
              <Field label={t("weight")}><input type="number" className="input" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></Field>
              <Field label={t("commodity")}><input className="input" value={form.commodity} onChange={(e) => setForm({ ...form, commodity: e.target.value })} /></Field>
              <Field label={t("equipment")}>
                <select className="input" value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })}>
                  {EQUIPMENT_TYPES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
                </select>
              </Field>
              <Field label={t("driver")}>
                <select className="input" value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
                  <option value="">{t("unassigned")}</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label={t("truck")}>
                <select className="input" value={form.truckId} onChange={(e) => setForm({ ...form, truckId: e.target.value })}>
                  <option value="">—</option>
                  {trucks.map((tr) => <option key={tr.id} value={tr.id}>{tr.unitNumber}</option>)}
                </select>
              </Field>
              <Field label={t("status")}>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {LOAD_STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
                </select>
              </Field>
            </div>
            <Field label={t("notes")}><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{formError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">{t("cancel")}</button>
              <button type="submit" className="btn-primary">{t("save")}</button>
            </div>
          </form>
        </Modal>
      )}

      {updateFor && <UpdateModal load={updateFor} onClose={() => setUpdateFor(null)} onSaved={() => { setUpdateFor(null); toast.success(t("updatedOk")); load(); }} />}

      {viewFor && (
        <Modal title={`${viewFor.refNumber}`} onClose={() => setViewFor(null)} wide>
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Info label={t("customer")} value={viewFor.customer?.name ?? viewFor.broker ?? "—"} />
            <Info label={t("origin")} value={viewFor.origin} />
            <Info label={t("destination")} value={viewFor.destination} />
            <Info label={t("pickupDate")} value={fmtDate(viewFor.pickupDate)} />
            <Info label={t("deliveryDate")} value={fmtDate(viewFor.deliveryDate)} />
            <Info label={t("equipment")} value={t(viewFor.equipment)} />
            <Info label={t("driver")} value={viewFor.driver?.name ?? t("unassigned")} />
            <Info label={t("truck")} value={viewFor.truck?.unitNumber ?? "—"} />
            <Info label={t("miles")} value={viewFor.miles ?? "—"} />
            <Info label={t("deadhead")} value={viewFor.deadheadMiles ?? "—"} />
            {viewFor.notes && <div className="col-span-2 sm:col-span-3"><Info label={t("notes")} value={viewFor.notes} /></div>}
          </div>

          {showFin && <PnlCard load={viewFor} settings={settings} t={t} />}
          <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{t("updates")}</h4>
          <div className="space-y-2">
            {history.length === 0 && <p className="text-sm text-slate-400">{t("noData")}</p>}
            {history.map((u) => (
              <div key={u.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {u.status && <span className={`badge ${LOAD_STATUS_COLORS[u.status]}`}>{t(u.status)}</span>}
                    {u.location && <span className="text-slate-600 dark:text-slate-300">📍 {u.location}</span>}
                  </div>
                  <span className="text-xs text-slate-400">{fmtDateTime(u.createdAt)}</span>
                </div>
                {u.note && <p className="mt-1 text-slate-700 dark:text-slate-200">{u.note}</p>}
                {u.authorName && <p className="mt-1 text-xs text-slate-400">— {u.authorName}</p>}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
function Info({ label, value }: { label: string; value: any }) {
  return <div><div className="text-xs uppercase text-slate-400">{label}</div><div className="font-medium text-slate-900 dark:text-white">{value}</div></div>;
}

function PnlCard({ load, settings, t }: { load: any; settings: CostSettings; t: (k: string) => string }) {
  const p = computePnl(load, settings, load.truck?.mpg ?? null);
  const Row = ({ label, value, sign, strong }: any) => (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className={strong ? "font-semibold text-slate-900 dark:text-white" : "text-slate-500"}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-bold" : ""} ${sign === "-" ? "text-red-500" : sign === "+" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
        {sign === "-" ? "−" : sign === "+" ? "+" : ""}{money2(Math.abs(value))}
      </span>
    </div>
  );
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t("pnl")}</h4>
        <div className="flex gap-2">
          <span className={`badge ${rpmBg(p.loadedRpm, settings.targetRpm)}`}>{t("loadedRpm")} ${p.loadedRpm.toFixed(2)}</span>
          {p.allInRpm > 0 && p.allInRpm !== p.loadedRpm && (
            <span className={`badge ${rpmBg(p.allInRpm, settings.targetRpm)}`}>{t("allInRpm")} ${p.allInRpm.toFixed(2)}</span>
          )}
        </div>
      </div>
      <Row label={t("grossRevenue")} value={p.revenue} sign="+" />
      <Row label={t("driverPayTotal")} value={p.driverPay} sign="-" />
      <Row label={`${t("fuelCost")} (${t("est")})`} value={p.fuelCost} sign="-" />
      <Row label={t("fixedCost")} value={p.fixedCost} sign="-" />
      {p.lumper > 0 && <Row label={t("lumper")} value={p.lumper} sign="-" />}
      <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
      <Row label={`${t("netProfit")} (${p.marginPct.toFixed(0)}% ${t("margin").toLowerCase()})`} value={p.netProfit} strong sign={p.netProfit >= 0 ? "+" : "-"} />
    </div>
  );
}

function UpdateModal({ load, onClose, onSaved }: any) {
  const { t } = useI18n();
  const [status, setStatus] = useState(load.status);
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/loads/${load.id}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, location, note }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <Modal title={`${t("addUpdate")} — ${load.refNumber}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t("status")}>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {LOAD_STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
          </select>
        </Field>
        <Field label={t("location")}><input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="St. Louis, MO" /></Field>
        <Field label={t("notes")}><textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">{t("cancel")}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{t("save")}</button>
        </div>
      </form>
    </Modal>
  );
}
