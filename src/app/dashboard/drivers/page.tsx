"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Phone, Truck as TruckIcon, Pencil, Trash2, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { can, DRIVER_STATUSES, DRIVER_STATUS_COLORS } from "@/lib/constants";
import Modal from "@/components/Modal";
import { PageHeader, EmptyState, Skeleton } from "@/components/ui";

const empty = {
  name: "", phone: "", email: "", truckNumber: "", trailerNumber: "",
  licenseNumber: "", status: "AVAILABLE", availableHours: "70",
  cdlExpiry: "", medicalExpiry: "", hireDate: "", homeBase: "", notes: "",
};

export default function DriversPage() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [role, setRole] = useState("");
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...empty });

  const load = useCallback(async () => {
    const res = await fetch("/api/drivers").then((r) => r.json());
    setDrivers(res.drivers ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setRole(me.user?.role ?? "");
    })();
    load();
  }, [load]);

  const canManage = can.manageDrivers(role);

  function openCreate() { setEditing(null); setForm({ ...empty }); setFormOpen(true); }
  function openEdit(d: any) {
    setEditing(d);
    setForm({
      name: d.name, phone: d.phone ?? "", email: d.email ?? "",
      truckNumber: d.truckNumber ?? "", trailerNumber: d.trailerNumber ?? "",
      licenseNumber: d.licenseNumber ?? "", status: d.status,
      availableHours: d.availableHours?.toString() ?? "70",
      cdlExpiry: d.cdlExpiry ? d.cdlExpiry.slice(0, 10) : "",
      medicalExpiry: d.medicalExpiry ? d.medicalExpiry.slice(0, 10) : "",
      hireDate: d.hireDate ? d.hireDate.slice(0, 10) : "",
      homeBase: d.homeBase ?? "", notes: d.notes ?? "",
    });
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/drivers/${editing.id}` : "/api/drivers";
    await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setFormOpen(false);
    toast.success(editing ? t("updatedOk") : t("createdOk"));
    load();
  }

  async function remove(d: any) {
    const ok = await confirm({ message: t("confirmDelete"), danger: true, confirmText: t("delete") });
    if (!ok) return;
    await fetch(`/api/drivers/${d.id}`, { method: "DELETE" });
    toast.success(t("deletedOk"));
    load();
  }

  async function quickStatus(d: any, status: string) {
    await fetch(`/api/drivers/${d.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("drivers")} subtitle={`${drivers.length} ${t("total").toLowerCase()}`}>
        {canManage && <button onClick={openCreate} className="btn-primary"><Plus size={16} /> {t("newDriver")}</button>}
      </PageHeader>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : drivers.length === 0 ? (
        <div className="card"><EmptyState icon={Users} title={t("noData")} /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.map((d) => (
            <div key={d.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                    {d.name.charAt(0)}
                  </div>
                  <div>
                    <Link href={`/dashboard/drivers/${d.id}`} className="font-semibold text-slate-900 hover:text-brand-600 hover:underline dark:text-white">{d.name}</Link>
                    {d.phone && <div className="flex items-center gap-1 text-xs text-slate-500"><Phone size={11} /> {d.phone}</div>}
                  </div>
                </div>
                <span className={`badge ${DRIVER_STATUS_COLORS[d.status]}`}>{t(d.status)}</span>
              </div>

              <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {d.truck && <div className="flex items-center gap-1.5"><TruckIcon size={13} className="text-slate-400" /> {d.truck.unitNumber}</div>}
                {d.availableHours != null && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400">HOS:</span>
                    <span className={`font-semibold tabular-nums ${d.availableHours < 15 ? "text-red-500" : d.availableHours < 30 ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"}`}>{d.availableHours} {t("hours")}</span>
                  </div>
                )}
                {d.licenseNumber && <div className="text-xs text-slate-400">{t("licenseNumber")}: {d.licenseNumber}</div>}
                {d._count && <div className="text-xs text-slate-400">{t("loads")}: {d._count.loads}</div>}
              </div>

              {canManage && (
                <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {DRIVER_STATUSES.map((s) => (
                    <button key={s} onClick={() => quickStatus(d, s)}
                      className={`rounded px-2 py-1 text-xs transition ${d.status === s ? DRIVER_STATUS_COLORS[s] : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                      {t(s)}
                    </button>
                  ))}
                  <span className="flex-1" />
                  <button onClick={() => openEdit(d)} className="rounded p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10"><Pencil size={14} /></button>
                  <button onClick={() => remove(d)} className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <Modal title={editing ? t("editDriver") : t("newDriver")} onClose={() => setFormOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div><label className="label">{t("name")} *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">{t("phone")}</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label className="label">{t("email")}</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="label">{t("driverStatus")}</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {DRIVER_STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
                </select>
              </div>
              <div><label className="label">{t("licenseNumber")}</label><input className="input" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} /></div>
              <div><label className="label">{t("availableHours")}</label><input type="number" step="0.5" className="input" value={form.availableHours} onChange={(e) => setForm({ ...form, availableHours: e.target.value })} /></div>
              <div><label className="label">{t("homeBase")}</label><input className="input" value={form.homeBase} onChange={(e) => setForm({ ...form, homeBase: e.target.value })} placeholder="Chicago, IL" /></div>
              <div><label className="label">{t("cdlExpiry")}</label><input type="date" className="input" value={form.cdlExpiry} onChange={(e) => setForm({ ...form, cdlExpiry: e.target.value })} /></div>
              <div><label className="label">{t("medicalExpiry")}</label><input type="date" className="input" value={form.medicalExpiry} onChange={(e) => setForm({ ...form, medicalExpiry: e.target.value })} /></div>
              <div><label className="label">{t("hireDate")}</label><input type="date" className="input" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} /></div>
            </div>
            <div><label className="label">{t("notes")}</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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
