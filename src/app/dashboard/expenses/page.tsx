"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Receipt } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { can, EXPENSE_CATEGORIES, EXPENSE_CATEGORY_COLORS } from "@/lib/constants";
import Modal from "@/components/Modal";
import { PageHeader, EmptyState, Skeleton, StatCard } from "@/components/ui";
import { money } from "@/lib/format";

const empty = {
  date: new Date().toISOString().slice(0, 10),
  category: "OTHER", amount: "", description: "", vendor: "",
  truckId: "", driverId: "", loadId: "",
};

export default function ExpensesPage() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [role, setRole] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [byCategory, setByCategory] = useState<Record<string, number>>({});
  const [trucks, setTrucks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...empty });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const q = filter ? `?category=${filter}` : "";
    const res = await fetch(`/api/expenses${q}`).then((r) => r.json());
    setRows(res.expenses ?? []);
    setTotal(res.total ?? 0);
    setByCategory(res.byCategory ?? {});
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setRole(me.user?.role ?? "");
      const [tr, dr] = await Promise.all([
        fetch("/api/trucks").then((r) => r.json()).catch(() => ({})),
        fetch("/api/drivers").then((r) => r.json()).catch(() => ({})),
      ]);
      setTrucks(tr.trucks ?? []);
      setDrivers(dr.drivers ?? []);
    })();
  }, []);

  useEffect(() => { load(); }, [load]);

  const canManage = can.manageExpenses(role);

  function openCreate() { setEditing(null); setForm({ ...empty }); setError(""); setFormOpen(true); }
  function openEdit(x: any) {
    setEditing(x);
    setForm({
      date: x.date ? x.date.slice(0, 10) : empty.date,
      category: x.category, amount: x.amount?.toString() ?? "",
      description: x.description ?? "", vendor: x.vendor ?? "",
      truckId: x.truckId ?? "", driverId: x.driverId ?? "", loadId: x.loadId ?? "",
    });
    setError("");
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const url = editing ? `/api/expenses/${editing.id}` : "/api/expenses";
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
    await fetch(`/api/expenses/${x.id}`, { method: "DELETE" });
    toast.success(t("deletedOk"));
    load();
  }

  const topCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="space-y-4">
      <PageHeader title={t("expenses")} subtitle={`${rows.length} ${t("total").toLowerCase()}`}>
        {canManage && <button onClick={openCreate} className="btn-primary"><Plus size={16} /> {t("newExpense")}</button>}
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label={t("totalExpenses")} value={money(total)} icon={Receipt} accent="red" />
        {topCats.map(([cat, val]) => (
          <StatCard key={cat} label={t(`exp_${cat}`)} value={money(val)} icon={Receipt} accent="amber" />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter("")} className={`badge ${!filter ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{t("all")}</button>
        {EXPENSE_CATEGORIES.map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={`badge ${filter === c ? "bg-brand-500 text-white" : EXPENSE_CATEGORY_COLORS[c]}`}>{t(`exp_${c}`)}</button>
        ))}
      </div>

      {loading ? (
        <div className="card"><div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div></div>
      ) : rows.length === 0 ? (
        <div className="card"><EmptyState icon={Receipt} title={t("noExpensesYet")} /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="px-4 py-3">{t("date")}</th>
                <th className="px-4 py-3">{t("category")}</th>
                <th className="px-4 py-3">{t("description")}</th>
                <th className="px-4 py-3">{t("vendor")}</th>
                <th className="px-4 py-3">{t("truck")} / {t("driver")}</th>
                <th className="px-4 py-3 text-right">{t("amount")}</th>
                {canManage && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id} className="border-b border-slate-50 hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-slate-500">{new Date(x.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td className="px-4 py-3"><span className={`badge ${EXPENSE_CATEGORY_COLORS[x.category] ?? ""}`}>{t(`exp_${x.category}`)}</span></td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{x.description ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{x.vendor ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{x.truck?.unitNumber ?? x.driver?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{money(x.amount)}</td>
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
        <Modal title={editing ? t("editExpense") : t("newExpense")} onClose={() => setFormOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">{t("date")}</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><label className="label">{t("category")}</label>
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`exp_${c}`)}</option>)}
                </select>
              </div>
              <div><label className="label">{t("amount")} ($) *</label><input type="number" step="0.01" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div><label className="label">{t("vendor")}</label><input className="input" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></div>
            </div>
            <div><label className="label">{t("description")}</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
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
