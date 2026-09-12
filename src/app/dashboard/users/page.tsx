"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, UserCog } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { ROLES, ROLE_COLORS } from "@/lib/constants";
import Modal from "@/components/Modal";
import { PageHeader, EmptyState, TableSkeleton } from "@/components/ui";

const empty = { name: "", email: "", password: "", role: "DISPATCHER", phone: "", driverId: "" };

export default function UsersPage() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...empty });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/users").then((r) => r.json());
    setUsers(res.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/drivers").then((r) => r.json()).then((d) => setDrivers(d.drivers ?? []));
  }, [load]);

  function openCreate() { setEditing(null); setForm({ ...empty }); setError(""); setFormOpen(true); }
  function openEdit(u: any) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, phone: u.phone ?? "", driverId: u.driverId ?? "" });
    setError("");
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const url = editing ? `/api/users/${editing.id}` : "/api/users";
    const res = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setFormOpen(false); toast.success(editing ? t("updatedOk") : t("createdOk")); load(); }
    else { const d = await res.json(); setError(d.error ?? t("somethingWrong")); }
  }

  async function remove(u: any) {
    const ok = await confirm({ message: t("confirmDelete"), danger: true, confirmText: t("delete") });
    if (!ok) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (res.ok) { toast.success(t("deletedOk")); load(); }
    else toast.error(t("somethingWrong"));
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("users")} subtitle={`${users.length} ${t("total").toLowerCase()}`}>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> {t("newUser")}</button>
      </PageHeader>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="th">{t("name")}</th>
                <th className="th">{t("email")}</th>
                <th className="th">{t("role")}</th>
                <th className="th">{t("linkedDriver")}</th>
                <th className="th text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="td font-medium text-slate-900 dark:text-white">{u.name}</td>
                  <td className="td text-slate-500">{u.email}</td>
                  <td className="td"><span className={`badge ${ROLE_COLORS[u.role]}`}>{t(u.role)}</span></td>
                  <td className="td text-slate-500">{u.driver?.name ?? "—"}</td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="rounded p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10"><Pencil size={15} /></button>
                      <button onClick={() => remove(u)} className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <TableSkeleton cols={5} />}
          {!loading && users.length === 0 && <EmptyState icon={UserCog} title={t("noData")} />}
        </div>
      </div>

      {formOpen && (
        <Modal title={editing ? t("editUser") : t("newUser")} onClose={() => setFormOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div><label className="label">{t("name")} *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label className="label">{t("email")} *</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div>
              <label className="label">{t("password")} {editing ? `(${t("leaveBlank")})` : "*"}</label>
              <input type="text" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">{t("role")} *</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r} value={r}>{t(r)}</option>)}
                </select>
              </div>
              <div><label className="label">{t("phone")}</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            {form.role === "DRIVER" && (
              <div><label className="label">{t("linkedDriver")}</label>
                <select className="input" value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
                  <option value="">{t("none")}</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
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
