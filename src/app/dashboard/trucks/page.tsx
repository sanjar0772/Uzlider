"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Truck as TruckIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { can, TRUCK_STATUSES, TRUCK_STATUS_COLORS } from "@/lib/constants";
import Modal from "@/components/Modal";
import { PageHeader, EmptyState, Skeleton } from "@/components/ui";

const empty = {
  unitNumber: "", plate: "", make: "", model: "", year: "",
  vin: "", status: "ACTIVE", driverId: "", odometer: "", mpg: "",
  registrationExpiry: "", inspectionExpiry: "", insuranceExpiry: "", notes: "",
};

export default function TrucksPage() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [role, setRole] = useState("");
  const [trucks, setTrucks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...empty });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/trucks").then((r) => r.json());
    setTrucks(res.trucks ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setRole(me.user?.role ?? "");
      const dr = await fetch("/api/drivers").then((r) => r.json());
      setDrivers(dr.drivers ?? []);
    })();
    load();
  }, [load]);

  const canManage = can.manageTrucks(role);

  function openCreate() { setEditing(null); setForm({ ...empty }); setError(""); setFormOpen(true); }
  function openEdit(x: any) {
    setEditing(x);
    setForm({
      unitNumber: x.unitNumber, plate: x.plate ?? "", make: x.make ?? "",
      model: x.model ?? "", year: x.year?.toString() ?? "", vin: x.vin ?? "",
      status: x.status, driverId: x.driverId ?? "",
      odometer: x.odometer?.toString() ?? "", mpg: x.mpg?.toString() ?? "",
      registrationExpiry: x.registrationExpiry ? x.registrationExpiry.slice(0, 10) : "",
      inspectionExpiry: x.inspectionExpiry ? x.inspectionExpiry.slice(0, 10) : "",
      insuranceExpiry: x.insuranceExpiry ? x.insuranceExpiry.slice(0, 10) : "",
      notes: x.notes ?? "",
    });
    setError("");
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const url = editing ? `/api/trucks/${editing.id}` : "/api/trucks";
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
    await fetch(`/api/trucks/${x.id}`, { method: "DELETE" });
    toast.success(t("deletedOk"));
    load();
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("trucks")} subtitle={`${trucks.length} ${t("total").toLowerCase()}`}>
        {canManage && <button onClick={openCreate} className="btn-primary"><Plus size={16} /> {t("newTruck")}</button>}
      </PageHeader>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : trucks.length === 0 ? (
        <div className="card"><EmptyState icon={TruckIcon} title={t("noData")} /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trucks.map((x) => (
            <div key={x.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">
                    <TruckIcon size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{x.unitNumber}</div>
                    <div className="text-xs text-slate-500">{[x.make, x.model].filter(Boolean).join(" ")} {x.year}</div>
                  </div>
                </div>
                <span className={`badge ${TRUCK_STATUS_COLORS[x.status]}`}>{t(x.status)}</span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {x.plate && <div className="text-xs text-slate-400">{t("plate")}: {x.plate}</div>}
                <div className="text-xs text-slate-400">{t("assignedDriver")}: {x.driver?.name ?? "—"}</div>
                {x._count && <div className="text-xs text-slate-400">{t("loads")}: {x._count.loads}</div>}
              </div>
              {canManage && (
                <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button onClick={() => openEdit(x)} className="rounded p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10"><Pencil size={14} /></button>
                  <button onClick={() => remove(x)} className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <Modal title={editing ? t("editTruck") : t("newTruck")} onClose={() => setFormOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">{t("unitNumber")} *</label><input className="input" value={form.unitNumber} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} required /></div>
              <div><label className="label">{t("plate")}</label><input className="input" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} /></div>
              <div><label className="label">{t("make")}</label><input className="input" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} /></div>
              <div><label className="label">{t("model")}</label><input className="input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
              <div><label className="label">{t("year")}</label><input type="number" className="input" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
              <div><label className="label">{t("truckStatus")}</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {TRUCK_STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">{t("odometer")}</label><input type="number" className="input" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} /></div>
              <div><label className="label">{t("mpg")}</label><input type="number" step="0.1" className="input" value={form.mpg} onChange={(e) => setForm({ ...form, mpg: e.target.value })} placeholder="6.5" /></div>
              <div><label className="label">{t("registration")}</label><input type="date" className="input" value={form.registrationExpiry} onChange={(e) => setForm({ ...form, registrationExpiry: e.target.value })} /></div>
              <div><label className="label">{t("inspection")}</label><input type="date" className="input" value={form.inspectionExpiry} onChange={(e) => setForm({ ...form, inspectionExpiry: e.target.value })} /></div>
              <div><label className="label">{t("insurance")}</label><input type="date" className="input" value={form.insuranceExpiry} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} /></div>
            </div>
            <div><label className="label">{t("vin")}</label><input className="input" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} /></div>
            <div><label className="label">{t("assignedDriver")}</label>
              <select className="input" value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
                <option value="">—</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
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
