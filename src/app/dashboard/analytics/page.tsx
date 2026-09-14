"use client";

import { useEffect, useState } from "react";
import { TrendingUp, DollarSign, Gauge, Route, Award, Fuel as FuelIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatCard, Skeleton, EmptyState } from "@/components/ui";
import { money, num } from "@/lib/format";
import { EXPENSE_CATEGORY_COLORS } from "@/lib/constants";

export default function AnalyticsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<any>(null);
  const [months, setMonths] = useState<6 | 12>(12);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?months=${months}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [months]);

  if (loading || !data)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );

  if (data.error)
    return <div className="card p-8 text-center text-slate-400">{data.error}</div>;

  const k = data.kpis;
  const maxTrend = Math.max(...data.trend.map((m: any) => m.revenue), 1);
  const expenseEntries = Object.entries(data.expenseMix as Record<string, number>).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("analytics")} subtitle={t("analyticsSubtitle")}>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {([6, 12] as const).map((m) => (
            <button key={m} onClick={() => setMonths(m)} className={`rounded-md px-3 py-1 text-sm font-medium ${months === m ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-500"}`}>{m}m</button>
          ))}
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t("grossRevenue")} value={money(k.grossRevenue)} icon={DollarSign} accent="emerald" />
        <StatCard label={t("trueCostPerMile")} value={`$${k.trueCostPerMile.toFixed(2)}`} icon={Gauge} accent="red" />
        <StatCard label={t("totalLoads")} value={num(k.totalMiles)} icon={Route} accent="brand" hint={t("miles")} />
        <StatCard label={t("fleetMpg")} value={k.fleetMpg ?? "—"} icon={FuelIcon} accent="amber" />
        <StatCard label={t("loadsDelivered")} value={num(k.loadsDelivered)} icon={TrendingUp} accent="cyan" />
        <StatCard label={t("drivers")} value={num(k.activeDrivers)} icon={Award} accent="purple" />
      </div>

      {/* Trend */}
      <div className="card p-5">
        <h3 className="mb-4 font-semibold text-slate-900 dark:text-white">{t("profitTrend")}</h3>
        <div className="flex items-end gap-2" style={{ height: 200 }}>
          {data.trend.map((m: any, i: number) => {
            const revH = Math.max((m.revenue / maxTrend) * 168, 2);
            const profH = Math.max((Math.max(m.profit, 0) / maxTrend) * 168, m.profit > 0 ? 2 : 0);
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end justify-center gap-0.5">
                  <div className="w-1/2 max-w-[20px] rounded-t bg-brand-500/40 transition-all hover:bg-brand-500/60" style={{ height: revH }} title={`${t("revenue")}: ${money(m.revenue)}`} />
                  <div className="w-1/2 max-w-[20px] rounded-t bg-emerald-500 transition-all hover:bg-emerald-600" style={{ height: profH }} title={`${t("netProfit")}: ${money(m.profit)}`} />
                </div>
                <span className="text-[10px] font-medium text-slate-400">{m.label}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-500/40" /> {t("revenue")}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> {t("netProfit")}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Driver scorecards */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">{t("driverScorecards")}</h3>
          {data.scorecards.length === 0 ? (
            <EmptyState icon={Award} title={t("noData")} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                    <th className="px-2 py-2">{t("driver")}</th>
                    <th className="px-2 py-2 text-right">{t("loads")}</th>
                    <th className="px-2 py-2 text-right">{t("revenue")}</th>
                    <th className="px-2 py-2 text-right">{t("netProfit")}</th>
                    <th className="px-2 py-2 text-right">{t("revenuePerMile")}</th>
                    <th className="px-2 py-2 text-right">{t("deadheadPct")}</th>
                    <th className="px-2 py-2 text-right">{t("onTimePct")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.scorecards.map((s: any, i: number) => (
                    <tr key={s.id} className="border-b border-slate-50 dark:border-slate-800/50">
                      <td className="px-2 py-2.5 font-medium text-slate-900 dark:text-white">
                        <span className="mr-1.5 text-xs text-slate-400">{i + 1}.</span>{s.name}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-slate-500">{s.loads}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{money(s.revenue)}</td>
                      <td className={`px-2 py-2.5 text-right font-semibold tabular-nums ${s.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{money(s.profit)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-slate-500">${s.revenuePerMile.toFixed(2)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-slate-500">{s.deadheadPct}%</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-slate-500">{s.onTimePct == null ? "—" : `${s.onTimePct}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expense mix */}
        <div className="card p-5">
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">{t("expenseMix")}</h3>
          {expenseEntries.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{t("noExpensesYet")}</p>
          ) : (
            <div className="space-y-2.5">
              {expenseEntries.map(([cat, val]) => {
                const pct = data.expenseTotal > 0 ? Math.round((val / data.expenseTotal) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300">{t(`exp_${cat}`)}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{money(val)} · {pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-semibold dark:border-slate-800">
                <span className="text-slate-500">{t("totalExpenses")}</span>
                <span className="text-slate-900 dark:text-white">{money(data.expenseTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top lanes */}
      <div className="card p-5">
        <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">{t("topLanes")}</h3>
        {data.topLanes.length === 0 ? (
          <EmptyState icon={Route} title={t("noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="px-2 py-2">{t("lane")}</th>
                  <th className="px-2 py-2 text-right">{t("loads")}</th>
                  <th className="px-2 py-2 text-right">{t("revenue")}</th>
                  <th className="px-2 py-2 text-right">{t("netProfit")}</th>
                  <th className="px-2 py-2 text-right">RPM</th>
                </tr>
              </thead>
              <tbody>
                {data.topLanes.map((l: any) => (
                  <tr key={l.lane} className="border-b border-slate-50 dark:border-slate-800/50">
                    <td className="px-2 py-2.5 font-medium text-slate-900 dark:text-white">{l.lane}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-500">{l.loads}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{money(l.revenue)}</td>
                    <td className={`px-2 py-2.5 text-right font-semibold tabular-nums ${l.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{money(l.profit)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-500">${l.rpm.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
