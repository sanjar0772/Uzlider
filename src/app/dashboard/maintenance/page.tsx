"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Wrench, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { can, MAINTENANCE_TYPES, MAINTENANCE_TYPE_COLORS } from "@/lib/constants";
import Modal from "@/components/Modal";
import { PageHeader, EmptyState, Skeleton, StatCard } from "@/components/ui";
import { money, fmtDate, num } from "@/lib/format";

const empty = {
  truckId: "", date: new Date().toISOString().slice(0, 10), type: "SERVICE",
  description: "", odometer: "", cost: "", vendor: "",
  nextServiceDate: "", nextServiceOdometer: "",
};

export default function MaintenancePage() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [role, setRole] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...empty });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/maintenance").then((r) => r.json());
    setRows(res.records ?? []);
    setTotalCost(res.totalCost ?? 0);
    setUpcoming(res.upcoming ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setRole(me.user?.role ?? "");
      const tr = await fetch("/api/trucks").then((r) => r.json()).catch(() => ({}));
      setTrucks(tr.trucks ?? []);
    })();
    load();
  }, [load]);

  const canManage = can.manageMaintenance(role);

  function openCreate() { setEditing(null); setForm({ ...empty }); setError(""); setFormOpen(true); }
  function openEdit(x: any) {
    setEditing(x);
    setForm({
      truckId: x.truckId, date: x.date ? x.date.slice(0, 10) : empty.date,
      type: x.type, description: x.description ?? "",
      odometer: x.odometer?.toString() ?? "", cost: x.cost?.toString() ?? "",
      vendor: x.vendor ?? "",
      nextServiceDate: x.nextServiceDate ? x.nextServiceDate.slice(0, 10) : "",
      nextServiceOdometer: x.nextServiceOdometer?.toString() ?? "",
    });
    setError("");
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const url = editing ? `/api/maintenance/${editing.id}` : "/api/maintenance";
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
    await fetch(`/api/maintenance/${x.id}`, { method: "DELETE" });
    toast.success(t("deletedOk"));
    load();
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("maintenance")} subtitle={t("repairLog")}>
        {canManage && <button onClick={openCreate} className="btn-primary"><Plus size={16} /> {t("newMaintenance")}</button>}
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("totalMaintenanceCost")} value={money(totalCost)} icon={Wrench} accent="amber" />
        <StatCard label={t("repairLog")} value={num(rows.length)} icon={Wrench} accent="brand" />
        <StatCard label={t("serviceReminders")} value={num(upcoming.length)} icon={AlertTriangle} accent={upcoming.length ? "red" : "emerald"} />
      </div>

      {upcoming.length > 0 && (
        <div className="card border-amber-200 p-4 dark:border-amber-500/30">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300"><AlertTriangle size={16} /> {t("serviceReminders")}</h3>
          <div className="flex flex-wrap gap-2">
            {upcoming.map((u) => (
              <span key={u.id} className={`badge ${u.days < 0 ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>
                {u.truck} · {t(`mnt_${u.type}`)} · {u.days < 0 ? `${Math.abs(u.days)}d overdue` : `${u.days}d`}
              </span>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="card"><div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div></div>
      ) : rows.length === 0 ? (
        <div className="card"><EmptyState icon={Wrench} title={t("noData")} /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="px-4 py-3">{t("date")}</th>
                <th className="px-4 py-3">{t("truck")}</th>
                <th className="px-4 py-3">{t("maintenanceType")}</th>
                <th className="px-4 py-3">{t("description")}</th>
                <th className="px-4 py-3 text-right">{t("odometer")}</th>
                <th className="px-4 py-3">{t("nextService")}</th>
                <th className="px-4 py-3 text-right">{t("cost")}</th>
                {canManage && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-slate-500">{fmtDate(x.date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{x.truck?.unitNumber ?? "—"}</td>
                  <td className="px-4 py-3"><span className={`badge ${MAINTENANCE_TYPE_COLORS[x.type] ?? ""}`}>{t(`mnt_${x.type}`)}</span></td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{x.description}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">{x.odometer ? num(x.odometer) : "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{x.nextServiceDate ? fmtDate(x.nextServiceDate) : x.nextServiceOdometer ? `${num(x.nextServiceOdometer)} mi` : "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{x.cost ? money(x.cost) : "—"}</td>
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
      )}

      {formOpen && (
        <Modal title={editing ? t("editMaintenance") : t("newMaintenance")} onClose={() => setFormOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">{t("truck")} *</label>
                <select className="input" value={form.truckId} onChange={(e) => setForm({ ...form, truckId: e.target.value })} required>
                  <option value="">—</option>
                  {trucks.map((x) => <option key={x.id} value={x.id}>{x.unitNumber}</option>)}
                </select>
              </div>
              <div><label className="label">{t("maintenanceType")}</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {MAINTENANCE_TYPES.map((c) => <option key={c} value={c}>{t(`mnt_${c}`)}</option>)}
                </select>
              </div>
              <div><label className="label">{t("date")}</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><label className="label">{t("cost")} ($)</label><input type="number" step="0.01" className="input" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
            </div>
            <div><label className="label">{t("description")} *</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">{t("odometer")}</label><input type="number" className="input" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} /></div>
              <div><label className="label">{t("vendor")}</label><input className="input" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></div>
              <div><label className="label">{t("nextService")}</label><input type="date" className="input" value={form.nextServiceDate} onChange={(e) => setForm({ ...form, nextServiceDate: e.target.value })} /></div>
              <div><label className="label">{t("nextServiceOdometer")}</label><input type="number" className="input" value={form.nextServiceOdometer} onChange={(e) => setForm({ ...form, nextServiceOdometer: e.target.value })} /></div>
            </div>
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
