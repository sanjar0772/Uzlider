"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Fuel as FuelIcon, Map, Download } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { can, US_STATES } from "@/lib/constants";
import Modal from "@/components/Modal";
import { PageHeader, EmptyState, Skeleton, StatCard } from "@/components/ui";
import { money, money2, fmtDate, num } from "@/lib/format";
import { exportCsv } from "@/lib/csv";

const empty = {
  date: new Date().toISOString().slice(0, 10), gallons: "", pricePerGallon: "",
  total: "", state: "", location: "", odometer: "", truckId: "", driverId: "",
};

export default function FuelPage() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [role, setRole] = useState("");
  const [tab, setTab] = useState<"log" | "ifta">("log");
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalGallons: 0, totalCost: 0, avgPrice: 0 });
  const [trucks, setTrucks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...empty });
  const [error, setError] = useState("");

  // IFTA
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [ifta, setIfta] = useState<any>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/fuel").then((r) => r.json());
    setRows(res.purchases ?? []);
    setStats({ totalGallons: res.totalGallons ?? 0, totalCost: res.totalCost ?? 0, avgPrice: res.avgPrice ?? 0 });
    setLoading(false);
  }, []);

  const loadIfta = useCallback(async () => {
    const res = await fetch(`/api/ifta?year=${year}&quarter=${quarter}`).then((r) => r.json());
    setIfta(res);
  }, [year, quarter]);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setRole(me.user?.role ?? "");
      if (me.user?.role !== "DRIVER") {
        const [tr, dr] = await Promise.all([
          fetch("/api/trucks").then((r) => r.json()).catch(() => ({})),
          fetch("/api/drivers").then((r) => r.json()).catch(() => ({})),
        ]);
        setTrucks(tr.trucks ?? []);
        setDrivers(dr.drivers ?? []);
      }
    })();
    load();
  }, [load]);

  useEffect(() => { if (tab === "ifta") loadIfta(); }, [tab, loadIfta]);

  const canManage = can.manageFuel(role);
  const isDriver = role === "DRIVER";
  const canIfta = can.viewFuel(role);

  function openCreate() { setEditing(null); setForm({ ...empty }); setError(""); setFormOpen(true); }
  function openEdit(x: any) {
    setEditing(x);
    setForm({
      date: x.date ? x.date.slice(0, 10) : empty.date,
      gallons: x.gallons?.toString() ?? "", pricePerGallon: x.pricePerGallon?.toString() ?? "",
      total: x.total?.toString() ?? "", state: x.state ?? "", location: x.location ?? "",
      odometer: x.odometer?.toString() ?? "", truckId: x.truckId ?? "", driverId: x.driverId ?? "",
    });
    setError("");
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const url = editing ? `/api/fuel/${editing.id}` : "/api/fuel";
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
      setError(d.error ?? t("somethingWrong"));
    }
  }

  async function remove(x: any) {
    const ok = await confirm({ message: t("confirmDelete"), danger: true, confirmText: t("delete") });
    if (!ok) return;
    await fetch(`/api/fuel/${x.id}`, { method: "DELETE" });
    toast.success(t("deletedOk"));
    load();
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("fuel")} subtitle={t("fuelLog")}>
        {tab === "ifta" && ifta?.jurisdictions?.length > 0 ? (
          <button onClick={() => exportCsv(`ifta-${ifta.year}-Q${ifta.quarter}`, ifta.jurisdictions)} className="btn-secondary"><Download size={16} /> {t("exportCsv")}</button>
        ) : rows.length > 0 ? (
          <button onClick={() => exportCsv("fuel", rows.map((x) => ({
            date: x.date?.slice(0, 10), state: x.state ?? "", location: x.location ?? "",
            gallons: x.gallons, pricePerGallon: x.pricePerGallon, total: x.total,
            odometer: x.odometer ?? "", truck: x.truck?.unitNumber ?? "", driver: x.driver?.name ?? "",
          })))} className="btn-secondary"><Download size={16} /> {t("exportCsv")}</button>
        ) : null}
        {canManage && <button onClick={openCreate} className="btn-primary"><Plus size={16} /> {t("newFuel")}</button>}
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("totalGallons")} value={num(stats.totalGallons)} icon={FuelIcon} accent="amber" />
        <StatCard label={t("totalExpenses")} value={money(stats.totalCost)} icon={FuelIcon} accent="red" />
        <StatCard label={t("avgPrice")} value={`$${stats.avgPrice.toFixed(3)}`} icon={FuelIcon} accent="brand" />
      </div>

      {canIfta && (
        <div className="flex gap-2">
          <button onClick={() => setTab("log")} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === "log" ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{t("fuelStops")}</button>
          <button onClick={() => setTab("ifta")} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === "ifta" ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{t("iftaSummary")}</button>
        </div>
      )}

      {tab === "log" ? (
        loading ? (
          <div className="card"><div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div></div>
        ) : rows.length === 0 ? (
          <div className="card"><EmptyState icon={FuelIcon} title={t("noData")} /></div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="px-4 py-3">{t("date")}</th>
                  <th className="px-4 py-3">{t("state")}</th>
                  <th className="px-4 py-3">{t("location")}</th>
                  {!isDriver && <th className="px-4 py-3">{t("truck")} / {t("driver")}</th>}
                  <th className="px-4 py-3 text-right">{t("gallons")}</th>
                  <th className="px-4 py-3 text-right">{t("pricePerGallon")}</th>
                  <th className="px-4 py-3 text-right">{t("total")}</th>
                  {canManage && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-500">{fmtDate(x.date)}</td>
                    <td className="px-4 py-3"><span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{x.state ?? "—"}</span></td>
                    <td className="px-4 py-3 text-slate-500">{x.location ?? "—"}</td>
                    {!isDriver && <td className="px-4 py-3 text-slate-500">{x.truck?.unitNumber ?? x.driver?.name ?? "—"}</td>}
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{x.gallons.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">${x.pricePerGallon.toFixed(3)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{money2(x.total)}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(x)} className="rounded p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10"><Pencil size={14} /></button>
                          <button onClick={() => remove(x)} className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <select className="input !w-auto" value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>
              {[1, 2, 3, 4].map((q) => <option key={q} value={q}>{t("quarter")} {q}</option>)}
            </select>
            <select className="input !w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {ifta?.period && <span className="text-sm text-slate-400">{ifta.period.from} → {ifta.period.to}</span>}
          </div>
          <p className="text-sm text-slate-400">{t("iftaHint")}</p>
          {!ifta ? (
            <div className="card"><Skeleton className="h-40" /></div>
          ) : ifta.jurisdictions.length === 0 ? (
            <div className="card"><EmptyState icon={Map} title={t("noData")} /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label={t("totalGallons")} value={num(ifta.totals.gallons)} icon={FuelIcon} accent="amber" />
                <StatCard label={t("totalExpenses")} value={money(ifta.totals.cost)} icon={FuelIcon} accent="red" />
                <StatCard label={t("avgPrice")} value={`$${ifta.totals.avgPrice.toFixed(3)}`} icon={FuelIcon} accent="brand" />
              </div>
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                      <th className="px-4 py-3">{t("jurisdiction")}</th>
                      <th className="px-4 py-3 text-right">{t("fuelStops")}</th>
                      <th className="px-4 py-3 text-right">{t("gallonsPurchased")}</th>
                      <th className="px-4 py-3 text-right">{t("avgPrice")}</th>
                      <th className="px-4 py-3 text-right">{t("cost")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ifta.jurisdictions.map((j: any) => (
                      <tr key={j.state} className="border-b border-slate-50 dark:border-slate-800/50">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{j.state === "—" ? t("unassignedState") : j.state}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-500">{j.stops}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{j.gallons.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-500">${j.avgPrice.toFixed(3)}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{money(j.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {formOpen && (
        <Modal title={editing ? t("editFuel") : t("newFuel")} onClose={() => setFormOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">{t("date")}</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><label className="label">{t("state")}</label>
                <select className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                  <option value="">—</option>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="label">{t("gallons")} *</label><input type="number" step="0.01" className="input" value={form.gallons} onChange={(e) => setForm({ ...form, gallons: e.target.value })} required /></div>
              <div><label className="label">{t("pricePerGallon")}</label><input type="number" step="0.001" className="input" value={form.pricePerGallon} onChange={(e) => setForm({ ...form, pricePerGallon: e.target.value })} /></div>
              <div><label className="label">{t("total")} ($)</label><input type="number" step="0.01" className="input" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} placeholder={t("optional")} /></div>
              <div><label className="label">{t("odometer")}</label><input type="number" className="input" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} /></div>
            </div>
            <div><label className="label">{t("location")}</label><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            {!isDriver && (
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">{t("truck")}</label>
                  <select className="input" value={form.truckId} onChange={(e) => setForm({ ...form, truckId: e.target.value })}>
                    <option value="">—</option>
                    {trucks.map((x) => <option key={x.id} value={x.id}>{x.unitNumber}</option>)}
                  </select>
                </div>
                <div><label className="label">{t("driver")}</label>
                  <select className="input" value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
                    <option value="">—</option>
                    {drivers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                </div>
              </div>
            )}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">{t("cancel")}</button>
              <button type="submit" className="btn-primary">{t("save")}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
