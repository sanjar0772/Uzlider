"use client";

import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import {
  can,
  LOAD_STATUSES,
  LOAD_STATUS_COLORS,
} from "@/lib/constants";
import Modal from "@/components/Modal";

type Driver = { id: string; name: string; status: string };
type LoadUpdate = {
  id: string;
  status: string | null;
  location: string | null;
  note: string | null;
  authorName: string | null;
  createdAt: string;
};
type Load = {
  id: string;
  refNumber: string;
  broker: string | null;
  origin: string;
  destination: string;
  pickupDate: string | null;
  deliveryDate: string | null;
  rate: number | null;
  miles: number | null;
  status: string;
  notes: string | null;
  driverId: string | null;
  dispatcherName: string | null;
  driver: Driver | null;
};

const empty = {
  refNumber: "",
  broker: "",
  origin: "",
  destination: "",
  pickupDate: "",
  deliveryDate: "",
  rate: "",
  miles: "",
  status: "NEW",
  driverId: "",
  notes: "",
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

export default function LoadsPage() {
  const { t } = useI18n();
  const [role, setRole] = useState("");
  const [loads, setLoads] = useState<Load[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Load | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [formError, setFormError] = useState("");

  const [updateFor, setUpdateFor] = useState<Load | null>(null);
  const [viewFor, setViewFor] = useState<Load | null>(null);
  const [history, setHistory] = useState<LoadUpdate[]>([]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    const res = await fetch("/api/loads?" + params.toString()).then((r) =>
      r.json()
    );
    setLoads(res.loads ?? []);
    setLoading(false);
  }, [q, statusFilter]);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setRole(me.user?.role ?? "");
      if (me.user?.role !== "DRIVER") {
        const dr = await fetch("/api/drivers").then((r) => r.json());
        setDrivers(dr.drivers ?? []);
      }
    })();
  }, []);

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...empty });
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(l: Load) {
    setEditing(l);
    setForm({
      refNumber: l.refNumber,
      broker: l.broker ?? "",
      origin: l.origin,
      destination: l.destination,
      pickupDate: l.pickupDate ? l.pickupDate.slice(0, 10) : "",
      deliveryDate: l.deliveryDate ? l.deliveryDate.slice(0, 10) : "",
      rate: l.rate?.toString() ?? "",
      miles: l.miles?.toString() ?? "",
      status: l.status,
      driverId: l.driverId ?? "",
      notes: l.notes ?? "",
    });
    setFormError("");
    setFormOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const url = editing ? `/api/loads/${editing.id}` : "/api/loads";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setFormOpen(false);
      load();
    } else {
      const d = await res.json();
      setFormError(d.error ?? "Error");
    }
  }

  async function remove(l: Load) {
    if (!confirm(t("confirmDelete"))) return;
    await fetch(`/api/loads/${l.id}`, { method: "DELETE" });
    load();
  }

  async function openView(l: Load) {
    setViewFor(l);
    const res = await fetch(`/api/loads/${l.id}`).then((r) => r.json());
    setHistory(res.load?.updates ?? []);
  }

  const canCreate = can.createLoad(role);
  const canEdit = can.editLoad(role);
  const canDelete = can.deleteLoad(role);
  const canUpdate = can.updateStatus(role);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("loads")}</h1>
        {canCreate && (
          <button onClick={openCreate} className="btn-primary">
            + {t("newLoad")}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          className="input max-w-xs"
          placeholder={t("search") + "..."}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input max-w-[180px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">{t("all")}</option>
          {LOAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(s)}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">{t("refNumber")}</th>
                <th className="px-4 py-3">{t("origin")} → {t("destination")}</th>
                <th className="px-4 py-3">{t("driver")}</th>
                <th className="px-4 py-3">{t("rate")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {t("loading")}
                  </td>
                </tr>
              ) : loads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {t("noData")}
                  </td>
                </tr>
              ) : (
                loads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{l.refNumber}</div>
                      {l.broker && (
                        <div className="text-xs text-slate-400">{l.broker}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>{l.origin}</div>
                      <div className="text-slate-400">→ {l.destination}</div>
                    </td>
                    <td className="px-4 py-3">
                      {l.driver?.name ?? (
                        <span className="text-slate-400">{t("unassigned")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {l.rate != null ? `$${l.rate.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${LOAD_STATUS_COLORS[l.status]}`}>
                        {t(l.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openView(l)}
                          className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                        >
                          {t("view")}
                        </button>
                        {canUpdate && (
                          <button
                            onClick={() => setUpdateFor(l)}
                            className="rounded px-2 py-1 text-xs text-amber-600 hover:bg-amber-50"
                          >
                            {t("addUpdate")}
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => openEdit(l)}
                            className="rounded px-2 py-1 text-xs text-brand-600 hover:bg-brand-50"
                          >
                            {t("edit")}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => remove(l)}
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            {t("delete")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit modal */}
      {formOpen && (
        <Modal
          title={editing ? t("editLoad") : t("newLoad")}
          onClose={() => setFormOpen(false)}
          wide
        >
          <form onSubmit={submitForm} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">{t("refNumber")} *</label>
                <input
                  className="input"
                  value={form.refNumber}
                  onChange={(e) => setForm({ ...form, refNumber: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">{t("broker")}</label>
                <input
                  className="input"
                  value={form.broker}
                  onChange={(e) => setForm({ ...form, broker: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{t("origin")} *</label>
                <input
                  className="input"
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">{t("destination")} *</label>
                <input
                  className="input"
                  value={form.destination}
                  onChange={(e) =>
                    setForm({ ...form, destination: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="label">{t("pickupDate")}</label>
                <input
                  type="date"
                  className="input"
                  value={form.pickupDate}
                  onChange={(e) =>
                    setForm({ ...form, pickupDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">{t("deliveryDate")}</label>
                <input
                  type="date"
                  className="input"
                  value={form.deliveryDate}
                  onChange={(e) =>
                    setForm({ ...form, deliveryDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">{t("rate")} ($)</label>
                <input
                  type="number"
                  className="input"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{t("miles")}</label>
                <input
                  type="number"
                  className="input"
                  value={form.miles}
                  onChange={(e) => setForm({ ...form, miles: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{t("assignDriver")}</label>
                <select
                  className="input"
                  value={form.driverId}
                  onChange={(e) =>
                    setForm({ ...form, driverId: e.target.value })
                  }
                >
                  <option value="">{t("unassigned")}</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t("status")}</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {LOAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(s)}
                    </option>
                  ))}
                </select>
              </div>
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
            {formError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {formError}
              </p>
            )}
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

      {/* Add update modal */}
      {updateFor && (
        <UpdateModal
          load={updateFor}
          onClose={() => setUpdateFor(null)}
          onSaved={() => {
            setUpdateFor(null);
            load();
          }}
        />
      )}

      {/* View modal */}
      {viewFor && (
        <Modal
          title={`${viewFor.refNumber} — ${t("updates")}`}
          onClose={() => setViewFor(null)}
          wide
        >
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <Info label={t("origin")} value={viewFor.origin} />
            <Info label={t("destination")} value={viewFor.destination} />
            <Info label={t("pickupDate")} value={fmtDate(viewFor.pickupDate)} />
            <Info label={t("deliveryDate")} value={fmtDate(viewFor.deliveryDate)} />
            <Info
              label={t("driver")}
              value={viewFor.driver?.name ?? t("unassigned")}
            />
            <Info label={t("dispatcher")} value={viewFor.dispatcherName ?? "—"} />
            {viewFor.notes && (
              <div className="col-span-2">
                <Info label={t("notes")} value={viewFor.notes} />
              </div>
            )}
          </div>
          <h4 className="mb-2 text-sm font-semibold">{t("updates")}</h4>
          <div className="space-y-2">
            {history.length === 0 && (
              <p className="text-sm text-slate-400">{t("noData")}</p>
            )}
            {history.map((u) => (
              <div
                key={u.id}
                className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {u.status && (
                      <span className={`badge ${LOAD_STATUS_COLORS[u.status]}`}>
                        {t(u.status)}
                      </span>
                    )}
                    {u.location && (
                      <span className="text-slate-600">📍 {u.location}</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(u.createdAt).toLocaleString()}
                  </span>
                </div>
                {u.note && <p className="mt-1 text-slate-700">{u.note}</p>}
                {u.authorName && (
                  <p className="mt-1 text-xs text-slate-400">— {u.authorName}</p>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function UpdateModal({
  load,
  onClose,
  onSaved,
}: {
  load: Load;
  onClose: () => void;
  onSaved: () => void;
}) {
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
        <div>
          <label className="label">{t("status")}</label>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {LOAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t("location")}</label>
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="St. Louis, MO"
          />
        </div>
        <div>
          <label className="label">{t("notes")}</label>
          <textarea
            className="input"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            {t("cancel")}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {t("save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
