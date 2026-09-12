"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, FileText, Send, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { can, INVOICE_STATUS_COLORS } from "@/lib/constants";
import { money2, fmtDate } from "@/lib/format";
import Modal from "@/components/Modal";
import { PageHeader, EmptyState, TableSkeleton, StatCard } from "@/components/ui";

export default function InvoicesPage() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [role, setRole] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ loadId: "", amount: "", dueAt: "", notes: "" });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/invoices").then((r) => r.json());
    setInvoices(res.invoices ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setRole(me.user?.role ?? "");
      const ld = await fetch("/api/loads").then((r) => r.json());
      setLoads((ld.loads ?? []).filter((l: any) => !l.invoice));
    })();
    load();
  }, [load]);

  const canManage = can.manageInvoices(role);

  const outstanding = invoices.filter((i) => i.status !== "PAID").reduce((s, i) => s + i.amount, 0);
  const paid = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.amount, 0);

  function openCreate() {
    setForm({ loadId: "", amount: "", dueAt: "", notes: "" });
    setError("");
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/invoices", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (res.ok) {
      setFormOpen(false);
      toast.success(t("createdOk"));
      load();
      const ld = await fetch("/api/loads").then((r) => r.json());
      setLoads((ld.loads ?? []).filter((l: any) => !l.invoice));
    } else {
      const d = await res.json();
      setError(d.error ?? t("somethingWrong"));
    }
  }

  async function setStatus(inv: any, status: string) {
    await fetch(`/api/invoices/${inv.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    toast.success(t("updatedOk"));
    load();
  }

  async function remove(inv: any) {
    const ok = await confirm({ message: t("confirmDelete"), danger: true, confirmText: t("delete") });
    if (!ok) return;
    await fetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
    toast.success(t("deletedOk"));
    load();
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("invoices")} subtitle={`${invoices.length} ${t("total").toLowerCase()}`}>
        {canManage && <button onClick={openCreate} className="btn-primary"><Plus size={16} /> {t("newInvoice")}</button>}
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label={t("outstanding")} value={money2(outstanding)} icon={FileText} accent="red" />
        <StatCard label={t("paidTotal")} value={money2(paid)} icon={CheckCircle2} accent="emerald" />
        <StatCard label={t("total")} value={invoices.length} icon={FileText} accent="brand" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="th">{t("invoiceNumber")}</th>
                <th className="th">{t("forLoad")}</th>
                <th className="th">{t("customer")}</th>
                <th className="th">{t("amount")}</th>
                <th className="th">{t("dueAt")}</th>
                <th className="th">{t("status")}</th>
                {canManage && <th className="th text-right">{t("actions")}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="td font-medium text-slate-900 dark:text-white">{inv.number}</td>
                  <td className="td">{inv.load?.refNumber ?? "—"}</td>
                  <td className="td">{inv.load?.customer?.name ?? "—"}</td>
                  <td className="td font-medium">{money2(inv.amount)}</td>
                  <td className="td">{fmtDate(inv.dueAt)}</td>
                  <td className="td"><span className={`badge ${INVOICE_STATUS_COLORS[inv.status]}`}>{t(inv.status)}</span></td>
                  {canManage && (
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        {inv.status === "DRAFT" && <button onClick={() => setStatus(inv, "SENT")} className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10" title={t("markSent")}><Send size={15} /></button>}
                        {inv.status !== "PAID" && <button onClick={() => setStatus(inv, "PAID")} className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" title={t("markPaid")}><CheckCircle2 size={15} /></button>}
                        <button onClick={() => remove(inv)} className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <TableSkeleton cols={7} />}
          {!loading && invoices.length === 0 && <EmptyState icon={FileText} title={t("noData")} />}
        </div>
      </div>

      {formOpen && (
        <Modal title={t("newInvoice")} onClose={() => setFormOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">{t("forLoad")} *</label>
              <select className="input" value={form.loadId} onChange={(e) => {
                const l = loads.find((x) => x.id === e.target.value);
                setForm({ ...form, loadId: e.target.value, amount: l?.rate?.toString() ?? form.amount });
              }} required>
                <option value="">—</option>
                {loads.map((l) => <option key={l.id} value={l.id}>{l.refNumber} · {l.origin} → {l.destination}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">{t("amount")} ($)</label><input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><label className="label">{t("dueAt")}</label><input type="date" className="input" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></div>
            </div>
            <div><label className="label">{t("notes")}</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">{t("cancel")}</button>
              <button type="submit" className="btn-primary">{t("createInvoice")}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
