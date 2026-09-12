"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Package, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LOAD_STATUSES, LOAD_STATUS_COLORS } from "@/lib/constants";
import { money } from "@/lib/format";
import { BarChart, DonutChart } from "@/components/Charts";
import { PageHeader, StatCard, Skeleton } from "@/components/ui";

export default function ReportsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data)
    return (
      <div className="space-y-4">
        <PageHeader title={t("reports")} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );

  const f = data.finance ?? {};
  const donut = LOAD_STATUSES.map((s) => ({ key: s, value: data.byStatus?.[s] ?? 0 })).filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t("reports")} subtitle={t("allTime")} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("totalRevenue")} value={money(f.revenue)} icon={DollarSign} accent="emerald" />
        <StatCard label={t("margin")} value={money(f.margin)} icon={TrendingUp} accent="brand" />
        <StatCard label={t("avgRate")} value={money(f.avgRate)} icon={Package} accent="purple" />
        <StatCard label={t("paidTotal")} value={money(f.paidTotal)} icon={CheckCircle2} accent="cyan" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">{t("revenueByMonth")}</h2>
          <BarChart data={data.revenueByMonth ?? []} height={200} />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">{t("byStatus")}</h2>
          {donut.length > 0 ? <DonutChart data={donut} labelFor={(k) => t(k)} /> : <p className="text-sm text-slate-400">{t("noData")}</p>}
        </div>
      </div>

      <div className="card">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">{t("byDriver")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="th">#</th>
                <th className="th">{t("driver")}</th>
                <th className="th">{t("loadsCount")}</th>
                <th className="th text-right">{t("revenue")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(data.topDrivers ?? []).map((d: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="td text-slate-400">{i + 1}</td>
                  <td className="td font-medium text-slate-900 dark:text-white">{d.name}</td>
                  <td className="td">{d.loads}</td>
                  <td className="td text-right font-semibold text-emerald-600 dark:text-emerald-400">{money(d.revenue)}</td>
                </tr>
              ))}
              {(data.topDrivers ?? []).length === 0 && (
                <tr><td colSpan={4} className="td text-center text-slate-400">{t("noData")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
