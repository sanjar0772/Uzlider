"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Building2, Phone, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { can } from "@/lib/constants";
import Modal from "@/components/Modal";
import { PageHeader, EmptyState, TableSkeleton } from "@/components/ui";

const empty = { name: "", contact: "", email: "", phone: "", mcNumber: "", address: "", notes: "" };

export default function CustomersPage() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [role, setRole] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...empty });

  const load = useCallback(async () => {
    const res = await fetch("/api/customers").then((r) => r.json());
    setCustomers(res.customers ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setRole(me.user?.role ?? "");
    })();
    load();
  }, [load]);

  const canManage = can.manageCustomers(role);

  function openCreate() { setEditing(null); setForm({ ...empty }); setFormOpen(true); }
  function openEdit(c: any) {
    setEditing(c);
    setForm({ name: c.name, contact: c.contact ?? "", email: c.email ?? "", phone: c.phone ?? "", mcNumber: c.mcNumber ?? "", address: c.address ?? "", notes: c.notes ?? "" });
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/customers/${editing.id}` : "/api/customers";
    await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setFormOpen(false);
    toast.success(editing ? t("updatedOk") : t("createdOk"));
    load();
  }

  async function remove(c: any) {
    const ok = await confirm({ message: t("confirmDelete"), danger: true, confirmText: t("delete") });
    if (!ok) return;
    await fetch(`/api/customers/${c.id}`, { method: "DELETE" });
    toast.success(t("deletedOk"));
    load();
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("customers")} subtitle={`${customers.length} ${t("total").toLowerCase()}`}>
        {canManage && <button onClick={openCreate} className="btn-primary"><Plus size={16} /> {t("newCustomer")}</button>}
      </PageHeader>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="th">{t("name")}</th>
                <th className="th">{t("contact")}</th>
                <th className="th">{t("phone")}</th>
                <th className="th">{t("mcNumber")}</th>
                <th className="th">{t("loads")}</th>
                {canManage && <th className="th text-right">{t("actions")}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="td font-medium text-slate-900 dark:text-white">{c.name}</td>
                  <td className="td">{c.contact ?? "—"}</td>
                  <td className="td">{c.phone ?? "—"}</td>
                  <td className="td">{c.mcNumber ?? "—"}</td>
                  <td className="td">{c._count?.loads ?? 0}</td>
                  {canManage && (
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="rounded p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10"><Pencil size={15} /></button>
                        <button onClick={() => remove(c)} className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <TableSkeleton cols={6} />}
          {!loading && customers.length === 0 && <EmptyState icon={Building2} title={t("noData")} />}
        </div>
      </div>

      {formOpen && (
        <Modal title={editing ? t("editCustomer") : t("newCustomer")} onClose={() => setFormOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div><label className="label">{t("name")} *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">{t("contact")}</label><input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
              <div><label className="label">{t("mcNumber")}</label><input className="input" value={form.mcNumber} onChange={(e) => setForm({ ...form, mcNumber: e.target.value })} /></div>
              <div><label className="label">{t("phone")}</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label className="label">{t("email")}</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><label className="label">{t("address")}</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
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
