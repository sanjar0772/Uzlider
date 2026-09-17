"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, DollarSign, Package, FileText, Phone, Mail, Building2,
  Printer, MapPin, CircleDollarSign,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { can, LOAD_STATUS_COLORS, INVOICE_STATUS_COLORS } from "@/lib/constants";
import { money, fmtDate } from "@/lib/format";
import { StatCard, Skeleton, EmptyState } from "@/components/ui";
import DocumentsPanel from "@/components/DocumentsPanel";
import { printStatement } from "@/lib/pdf";

export default function CustomerDetailPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/customers/${id}`).then((r) => r.json());
    setData(res);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setRole(me.user?.role ?? "");
    })();
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div>;
  if (!data?.customer) return <div className="card p-8 text-center text-slate-400">{t("noData")}</div>;

  const { customer, loads, metrics, aging } = data;
  const agingRows = [
    { label: t("d0_30") || "0–30", value: aging.d0_30 },
    { label: "31–60", value: aging.d31_60 },
    { label: "60+", value: aging.d60plus },
  ];
  const agingMax = Math.max(aging.notDue, aging.d0_30, aging.d31_60, aging.d60plus, 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowLeft size={18} /></button>
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800"><Building2 size={22} /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{customer.name}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              {customer.contact && <span>{customer.contact}</span>}
              {customer.phone && <span className="flex items-center gap-1"><Phone size={12} /> {customer.phone}</span>}
              {customer.email && <span className="flex items-center gap-1"><Mail size={12} /> {customer.email}</span>}
              {customer.mcNumber && <span>MC# {customer.mcNumber}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {can.viewInvoices(role) && (
            <button onClick={() => printStatement(customer, data)} className="btn-secondary"><Printer size={16} /> <span className="hidden sm:inline">Statement</span></button>
          )}
          <Link href="/dashboard/customers" className="btn-secondary">{t("customers")}</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={t("revenue")} value={money(metrics.revenue)} icon={DollarSign} accent="emerald" />
        <StatCard label={t("loads")} value={metrics.loadsCount} icon={Package} accent="brand" />
        <StatCard label={t("outstanding")} value={money(metrics.outstanding)} icon={CircleDollarSign} accent="red" />
        <StatCard label={t("paidTotal")} value={money(metrics.paid)} icon={DollarSign} accent="cyan" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><Package size={16} /> {t("loads")} <span className="text-sm font-normal text-slate-400">· {metrics.loadsCount}</span></h3>
            {loads.length === 0 ? <EmptyState icon={Package} title={t("noData")} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2">{t("refNumber")}</th>
                    <th className="px-3 py-2">{t("lane")}</th>
                    <th className="px-3 py-2">{t("status")}</th>
                    <th className="px-3 py-2 text-right">{t("rate")}</th>
                    <th className="px-3 py-2">{t("invoices")}</th>
                  </tr></thead>
                  <tbody>
                    {loads.slice(0, 15).map((l: any) => (
                      <tr key={l.id} className="border-t border-slate-50 hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/30">
                        <td className="td"><Link href={`/dashboard/loads/${l.id}`} className="font-medium text-brand-600 hover:underline">{l.refNumber}</Link></td>
                        <td className="td text-slate-500">{l.origin} → {l.destination}</td>
                        <td className="td"><span className={`badge ${LOAD_STATUS_COLORS[l.status]}`}>{t(l.status)}</span></td>
                        <td className="td text-right tabular-nums">{money(l.rate)}</td>
                        <td className="td">{l.invoice ? <span className={`badge ${INVOICE_STATUS_COLORS[l.invoice.status]}`}>{t(l.invoice.status)}</span> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {/* AR aging */}
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><CircleDollarSign size={16} /> {t("aging") || "AR aging"}</h3>
            <div className="space-y-2.5">
              <AgingBar label={t("notDue") || "Not due"} value={aging.notDue} max={agingMax} tone="bg-emerald-500" />
              {agingRows.map((r) => (
                <AgingBar key={r.label} label={r.label} value={r.value} max={agingMax} tone={r.label === "60+" ? "bg-red-500" : r.label === "31–60" ? "bg-amber-500" : "bg-brand-500"} />
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-sm font-semibold dark:border-slate-800">
                <span className="text-slate-500">{t("outstanding")}</span>
                <span className="text-slate-900 dark:text-white">{money(metrics.outstanding)}</span>
              </div>
            </div>
          </div>

          {customer.address && (
            <div className="card p-5">
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><MapPin size={16} /> {t("address")}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{customer.address}</p>
            </div>
          )}

          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><FileText size={16} /> {t("documents")}</h3>
            <DocumentsPanel owner={{ customerId: id }} canManage={can.manageDocuments(role)} compact />
          </div>
        </div>
      </div>
    </div>
  );
}

function AgingBar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-medium text-slate-900 dark:text-white">{money(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
