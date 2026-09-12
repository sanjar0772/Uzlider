"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package, Rocket, CheckCircle2, UserCheck, DollarSign, TrendingUp,
  Truck as TruckIcon, AlertTriangle, MapPin, Trophy, Gauge, Fuel, ShieldCheck, Wallet,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { LOAD_STATUS_COLORS, DRIVER_STATUS_COLORS, DRIVER_STATUSES, LOAD_STATUSES } from "@/lib/constants";
import { money, fmtDate } from "@/lib/format";
import { rpmBg } from "@/lib/finance";
import { StatCard, Skeleton } from "@/components/ui";
import { BarChart, DonutChart } from "@/components/Charts";

export default function DashboardPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/stats").then((r) => r.json());
    setData(res);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (loading)
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    );

  if (data?.role === "DRIVER") return <DriverDashboard data={data} reload={load} toast={toast} t={t} />;
  return <StaffDashboard data={data} t={t} />;
}

function StaffDashboard({ data, t }: any) {
  const c = data.counts;
  const f = data.finance;
  const showFin = data.canFinancials;
  const comp = data.compliance ?? { expiringSoon: 0, expired: 0 };
  const compTotal = comp.expiringSoon + comp.expired;

  const donutData = LOAD_STATUSES.map((s) => ({ key: s, value: data.byStatus[s] ?? 0 })).filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Compliance alert banner */}
      {compTotal > 0 && (
        <Link href="/dashboard/compliance" className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
          <div className="flex-1 text-sm">
            <span className="font-semibold text-amber-800 dark:text-amber-300">
              {comp.expired > 0 && `${comp.expired} ${t("expired")}`}
              {comp.expired > 0 && comp.expiringSoon > 0 && " · "}
              {comp.expiringSoon > 0 && `${comp.expiringSoon} ${t("expiringSoon")}`}
            </span>
            <span className="ml-1 text-amber-700 dark:text-amber-400/80">— {t("documents")}</span>
          </div>
          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">{t("compliance")} →</span>
        </Link>
      )}

      {/* Money row */}
      {showFin && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label={t("netProfit")} value={money(f.netProfit)} icon={TrendingUp} accent="emerald" hint={`${f.marginPct}% ${t("margin").toLowerCase()}`} />
          <StatCard label={t("totalRevenue")} value={money(f.revenue)} icon={DollarSign} accent="brand" />
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${rpmBg(f.avgRpm, f.targetRpm)}`}><Gauge size={20} /></div>
              <span className={`badge ${rpmBg(f.avgRpm, f.targetRpm)}`}>{t("targetRpm")} ${f.targetRpm.toFixed(2)}</span>
            </div>
            <div className="mt-3 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">${f.avgRpm.toFixed(2)}<span className="text-sm font-normal text-slate-400">{t("perMile")}</span></div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{t("rpm")}</div>
          </div>
          <StatCard label={t("fuelCost")} value={money(f.fuelCost)} icon={Fuel} accent="amber" hint={`${money(f.driverCost)} ${t("driverPayTotal").toLowerCase()}`} />
        </div>
      )}

      {/* Operations row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("activeLoads")} value={c.active} icon={Rocket} accent="amber" />
        <StatCard label={t("delivered")} value={c.delivered} icon={CheckCircle2} accent="emerald" />
        <StatCard label={t("availableDrivers")} value={`${c.driversAvailable}/${c.driversTotal}`} icon={UserCheck} accent="cyan" />
        <StatCard label={t("trucks")} value={`${c.trucksActive}/${c.trucksTotal}`} icon={TruckIcon} accent="purple" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white">{showFin ? t("profitByMonth") : t("revenueByMonth")}</h2>
            {showFin && <span className="text-xs text-slate-400">{t("totalMiles")}: {f.totalMiles.toLocaleString()}</span>}
          </div>
          <BarChart data={showFin ? data.revenueByMonth.map((m: any) => ({ label: m.label, value: m.profit })) : data.revenueByMonth} height={190} />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">{t("loadsByStatus")}</h2>
          {donutData.length > 0 ? <DonutChart data={donutData} labelFor={(k) => t(k)} /> : <p className="text-sm text-slate-400">{t("noData")}</p>}
        </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><AlertTriangle size={16} className="text-amber-500" />{t("unassignedLoads")}</h2>
            <Link href="/dashboard/board" className="text-sm text-brand-600 hover:underline">{t("dispatchBoard")} →</Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.unassignedList.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">{t("healthy")} ✓</p>}
            {data.unassignedList.map((l: any) => (
              <Link key={l.id} href="/dashboard/loads" className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">{l.refNumber}</div>
                  <div className="text-sm text-slate-500">{l.origin} → {l.destination}</div>
                </div>
                {showFin && l.rate && l.miles ? (
                  <span className={`badge ${rpmBg(l.rate / l.miles, f.targetRpm)}`}>${(l.rate / l.miles).toFixed(2)}{t("perMile")}</span>
                ) : (
                  <span className={`badge ${LOAD_STATUS_COLORS[l.status]}`}>{t(l.status)}</span>
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><Trophy size={16} className="text-amber-500" />{t("topDrivers")}</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.topDrivers.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">{t("noData")}</p>}
            {data.topDrivers.map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800">{i + 1}</span>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{d.name}</div>
                    <div className="text-xs text-slate-400">{d.loads} {t("loads").toLowerCase()}</div>
                  </div>
                </div>
                {showFin && (
                  <div className="text-right">
                    <div className="font-semibold tabular-nums text-slate-900 dark:text-white">{money(d.revenue)}</div>
                    <div className="text-xs tabular-nums text-emerald-600 dark:text-emerald-400">+{money(d.profit)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DriverDashboard({ data, reload, toast, t }: any) {
  const cur = data.current;

  async function updateStatus(loadId: string, status: string) {
    await fetch(`/api/loads/${loadId}/updates`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    toast.success(t("updatedOk"));
    reload();
  }
  async function setMyStatus(status: string) {
    if (!data.driver) return;
    await fetch(`/api/drivers/${data.driver.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    toast.success(t("updatedOk"));
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("myLoads")} value={data.counts.total} icon={Package} accent="brand" />
        <StatCard label={t("activeLoads")} value={data.counts.active} icon={Rocket} accent="amber" />
        <StatCard label={t("delivered")} value={data.counts.delivered} icon={CheckCircle2} accent="emerald" />
        <StatCard label={t("grossPay")} value={money(data.counts.myPay)} icon={Wallet} accent="cyan" />
      </div>

      {data.driver && (
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white">{t("myStatus")}</h2>
            {data.driver.availableHours != null && (
              <span className="flex items-center gap-1.5 text-sm">
                <ShieldCheck size={15} className="text-emerald-500" />
                <span className="font-semibold tabular-nums">{data.driver.availableHours}</span>
                <span className="text-slate-400">{t("hours")} · HOS</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {DRIVER_STATUSES.map((s) => (
              <button key={s} onClick={() => setMyStatus(s)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${data.driver.status === s ? DRIVER_STATUS_COLORS[s] : "border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"}`}>
                {t(s)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><MapPin size={18} className="text-brand-500" /> {t("currentLoad")}</h2>
        {cur ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{cur.refNumber}</div>
                <div className="text-slate-500">{cur.customer?.name}</div>
              </div>
              <span className={`badge ${LOAD_STATUS_COLORS[cur.status]}`}>{t(cur.status)}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="text-center"><div className="font-semibold text-slate-900 dark:text-white">{cur.origin}</div><div className="text-xs text-slate-400">{fmtDate(cur.pickupDate)}</div></div>
              <div className="flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600" />
              <TruckIcon size={20} className="text-brand-500" />
              <div className="flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600" />
              <div className="text-center"><div className="font-semibold text-slate-900 dark:text-white">{cur.destination}</div><div className="text-xs text-slate-400">{fmtDate(cur.deliveryDate)}</div></div>
            </div>
            <div className="flex flex-wrap gap-2">
              {["IN_TRANSIT", "DELIVERED"].map((s) => (
                <button key={s} onClick={() => updateStatus(cur.id, s)} className="btn-primary">{t(s)}</button>
              ))}
            </div>
          </div>
        ) : <p className="py-6 text-center text-slate-400">{t("noCurrentLoad")}</p>}
      </div>

      <div className="card">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800"><h2 className="font-semibold text-slate-900 dark:text-white">{t("myLoads")}</h2></div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.recent.map((l: any) => (
            <div key={l.id} className="flex items-center justify-between px-4 py-3">
              <div><div className="font-medium text-slate-900 dark:text-white">{l.refNumber}</div><div className="text-sm text-slate-500">{l.origin} → {l.destination}</div></div>
              <span className={`badge ${LOAD_STATUS_COLORS[l.status]}`}>{t(l.status)}</span>
            </div>
          ))}
          {data.recent.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">{t("noData")}</p>}
        </div>
      </div>
    </div>
  );
}
