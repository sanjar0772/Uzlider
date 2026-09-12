"use client";

import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import {
  can,
  DRIVER_STATUSES,
  DRIVER_STATUS_COLORS,
} from "@/lib/constants";
import Modal from "@/components/Modal";

type Driver = {
  id: string;
  name: string;
  phone: string | null;
  truckNumber: string | null;
  trailerNumber: string | null;
  licenseNumber: string | null;
  status: string;
  notes: string | null;
  _count?: { loads: number };
};

const empty = {
  name: "",
  phone: "",
  truckNumber: "",
  trailerNumber: "",
  licenseNumber: "",
  status: "AVAILABLE",
  notes: "",
};

export default function DriversPage() {
  const { t } = useI18n();
  const [role, setRole] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
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

  function openCreate() {
    setEditing(null);
    setForm({ ...empty });
    setFormOpen(true);
  }
  function openEdit(d: Driver) {
    setEditing(d);
    setForm({
      name: d.name,
      phone: d.phone ?? "",
      truckNumber: d.truckNumber ?? "",
      trailerNumber: d.trailerNumber ?? "",
      licenseNumber: d.licenseNumber ?? "",
      status: d.status,
      notes: d.notes ?? "",
    });
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/drivers/${editing.id}` : "/api/drivers";
    const method = editing ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setFormOpen(false);
    load();
  }

  async function remove(d: Driver) {
    if (!confirm(t("confirmDelete"))) return;
    await fetch(`/api/drivers/${d.id}`, { method: "DELETE" });
    load();
  }

  async function quickStatus(d: Driver, status: string) {
    await fetch(`/api/drivers/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("drivers")}</h1>
        {canManage && (
          <button onClick={openCreate} className="btn-primary">
            + {t("newDriver")}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400">{t("loading")}</p>
      ) : drivers.length === 0 ? (
        <p className="text-slate-400">{t("noData")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.map((d) => (
            <div key={d.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{d.name}</div>
                  {d.phone && (
                    <div className="text-sm text-slate-500">{d.phone}</div>
                  )}
                </div>
                <span className={`badge ${DRIVER_STATUS_COLORS[d.status]}`}>
                  {t(d.status)}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {d.truckNumber && (
                  <div>
                    <span className="text-slate-400">{t("truckNumber")}: </span>
                    {d.truckNumber}
                  </div>
                )}
                {d.trailerNumber && (
                  <div>
                    <span className="text-slate-400">{t("trailerNumber")}: </span>
                    {d.trailerNumber}
                  </div>
                )}
                {d.licenseNumber && (
                  <div className="col-span-2">
                    <span className="text-slate-400">{t("licenseNumber")}: </span>
                    {d.licenseNumber}
                  </div>
                )}
                {d._count && (
                  <div className="col-span-2 text-slate-400">
                    {t("loads")}: {d._count.loads}
                  </div>
                )}
              </div>

              {canManage && (
                <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-3">
                  {DRIVER_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => quickStatus(d, s)}
                      className={`rounded px-2 py-1 text-xs ${
                        d.status === s
                          ? DRIVER_STATUS_COLORS[s]
                          : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {t(s)}
                    </button>
                  ))}
                  <span className="flex-1" />
                  <button
                    onClick={() => openEdit(d)}
                    className="rounded px-2 py-1 text-xs text-brand-600 hover:bg-brand-50"
                  >
                    {t("edit")}
                  </button>
                  <button
                    onClick={() => remove(d)}
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    {t("delete")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <Modal
          title={editing ? t("editDriver") : t("newDriver")}
          onClose={() => setFormOpen(false)}
        >
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">{t("name")} *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{t("phone")}</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{t("driverStatus")}</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {DRIVER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t("truckNumber")}</label>
                <input
                  className="input"
                  value={form.truckNumber}
                  onChange={(e) =>
                    setForm({ ...form, truckNumber: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">{t("trailerNumber")}</label>
                <input
                  className="input"
                  value={form.trailerNumber}
                  onChange={(e) =>
                    setForm({ ...form, trailerNumber: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="label">{t("licenseNumber")}</label>
              <input
                className="input"
                value={form.licenseNumber}
                onChange={(e) =>
                  setForm({ ...form, licenseNumber: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">{t("notes")}</label>
              <textarea
                className="input"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="btn-secondary"
              >
                {t("cancel")}
              </button>
              <button type="submit" className="btn-primary">
                {t("save")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
