"use client";

import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { ROLES, ROLE_COLORS } from "@/lib/constants";
import Modal from "@/components/Modal";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  driverId: string | null;
  driver: { name: string } | null;
};
type Driver = { id: string; name: string };

const empty = {
  name: "",
  email: "",
  password: "",
  role: "DISPATCHER",
  phone: "",
  driverId: "",
};

export default function UsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/users").then((r) => r.json());
    setUsers(res.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/drivers")
      .then((r) => r.json())
      .then((d) => setDrivers(d.drivers ?? []));
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...empty });
    setError("");
    setFormOpen(true);
  }
  function openEdit(u: User) {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      phone: u.phone ?? "",
      driverId: u.driverId ?? "",
    });
    setError("");
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const url = editing ? `/api/users/${editing.id}` : "/api/users";
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
      setError(d.error ?? "Error");
    }
  }

  async function remove(u: User) {
    if (!confirm(t("confirmDelete"))) return;
    await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("users")}</h1>
        <button onClick={openCreate} className="btn-primary">
          + {t("newUser")}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">{t("name")}</th>
                <th className="px-4 py-3">{t("email")}</th>
                <th className="px-4 py-3">{t("role")}</th>
                <th className="px-4 py-3">{t("linkedDriver")}</th>
                <th className="px-4 py-3 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    {t("loading")}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ROLE_COLORS[u.role]}`}>
                        {t(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {u.driver?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="rounded px-2 py-1 text-xs text-brand-600 hover:bg-brand-50"
                        >
                          {t("edit")}
                        </button>
                        <button
                          onClick={() => remove(u)}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <Modal
          title={editing ? t("editUser") : t("newUser")}
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
            <div>
              <label className="label">{t("email")} *</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">
                {t("password")} {editing && `(${t("leaveBlank")})`}
                {!editing && " *"}
              </label>
              <input
                type="text"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editing}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{t("role")} *</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {t(r)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t("phone")}</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            {form.role === "DRIVER" && (
              <div>
                <label className="label">{t("linkedDriver")}</label>
                <select
                  className="input"
                  value={form.driverId}
                  onChange={(e) =>
                    setForm({ ...form, driverId: e.target.value })
                  }
                >
                  <option value="">{t("none")}</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
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
    </div>
  );
}
