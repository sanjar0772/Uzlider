"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Gauge, Wallet, FileClock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LOAD_STATUSES } from "@/lib/constants";
import { money } from "@/lib/format";
import { rpmBg } from "@/lib/finance";
import { BarChart, DonutChart } from "@/components/Charts";
import { PageHeader, StatCard, Skeleton } from "@/components/ui";

export default function ReportsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [stats, setl, inv] = await Promise.all([
        fetch("/api/stats").then((r) => r.json()),
        fetch("/api/settlements").then((r) => r.json()),
        fetch("/api/invoices").then((r) => r.json()).catch(() => ({ invoices: [] })),
      ]);
      setData(stats);
      setSettlements(setl.settlements ?? []);
      setInvoices(inv.invoices ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading || !data)
    return (
      <div className="space-y-4">
        <PageHeader title={t("reports")} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      </div>
    );

  const f = data.finance ?? {};
  const donut = LOAD_STATUSES.map((s) => ({ key: s, value: data.byStatus?.[s] ?? 0 })).filter((d) => d.value > 0);

  // Invoice aging
  const now = Date.now();
  const aging = { d0_30: 0, d31_60: 0, d60plus: 0 };
  for (const inv of invoices) {
    if (inv.status === "PAID") continue;
    const base = inv.issuedAt ? new Date(inv.issuedAt).getTime() : new Date(inv.createdAt).getTime();
    const days = Math.floor((now - base) / 86400000);
    if (days <= 30) aging.d0_30 += inv.amount;
    else if (days <= 60) aging.d31_60 += inv.amount;
    else aging.d60plus += inv.amount;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("reports")} subtitle={t("allTime")} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("netProfit")} value={money(f.netProfit)} icon={TrendingUp} accent="emerald" hint={`${f.marginPct}% ${t("margin").toLowerCase()}`} />
        <StatCard label={t("totalRevenue")} value={money(f.revenue)} icon={DollarSign} accent="brand" />
        <div className="card p-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${rpmBg(f.avgRpm, f.targetRpm)}`}><Gauge size={20} /></div>
          <div className="mt-3 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">${(f.avgRpm ?? 0).toFixed(2)}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{t("rpm")}</div>
        </div>
        <StatCard label={t("fuelCost")} value={money(f.fuelCost)} icon={Wallet} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">{t("profitByMonth")}</h2>
          <BarChart data={(data.revenueByMonth ?? []).map((m: any) => ({ label: m.label, value: m.profit }))} height={200} />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">{t("byStatus")}</h2>
          {donut.length > 0 ? <DonutChart data={donut} labelFor={(k) => t(k)} /> : <p className="text-sm text-slate-400">{t("noData")}</p>}
        </div>
      </div>

      {/* Invoice aging */}
      <div className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><FileClock size={18} /> {t("aging")}</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-500/10">
            <div className="text-xs text-emerald-700 dark:text-emerald-400">{t("d0_30")}</div>
            <div className="mt-1 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{money(aging.d0_30)}</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-500/10">
            <div className="text-xs text-amber-700 dark:text-amber-400">{t("d31_60")}</div>
            <div className="mt-1 text-xl font-bold tabular-nums text-amber-700 dark:text-amber-300">{money(aging.d31_60)}</div>
          </div>
          <div className="rounded-lg bg-red-50 p-4 dark:bg-red-500/10">
            <div className="text-xs text-red-700 dark:text-red-400">{t("d60plus")}</div>
            <div className="mt-1 text-xl font-bold tabular-nums text-red-700 dark:text-red-300">{money(aging.d60plus)}</div>
          </div>
        </div>
      </div>

      {/* Driver settlements */}
      <div className="card">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><Wallet size={16} /> {t("settlements")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="th">{t("driver")}</th>
                <th className="th">{t("loadsCount")}</th>
                <th className="th text-right">{t("grossPay")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {settlements.map((s) => (
                <tr key={s.driverId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="td font-medium text-slate-900 dark:text-white">{s.name}</td>
                  <td className="td">{s.count}</td>
                  <td className="td text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{money(s.gross)}</td>
                </tr>
              ))}
              {settlements.length === 0 && <tr><td colSpan={3} className="td text-center text-slate-400">{t("noData")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
