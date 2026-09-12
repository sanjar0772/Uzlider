"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Rocket,
  CheckCircle2,
  UserCheck,
  DollarSign,
  TrendingUp,
  Truck as TruckIcon,
  AlertCircle,
  MapPin,
  Trophy,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { LOAD_STATUS_COLORS, DRIVER_STATUS_COLORS, DRIVER_STATUSES, LOAD_STATUSES } from "@/lib/constants";
import { money, fmtDate } from "@/lib/format";
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

  useEffect(() => {
    load();
  }, []);

  if (loading)
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );

  if (data?.role === "DRIVER") return <DriverDashboard data={data} reload={load} toast={toast} t={t} />;

  return <StaffDashboard data={data} t={t} />;
}

function StaffDashboard({ data, t }: any) {
  const c = data.counts;
  const f = data.finance;
  const showFin = data.canFinancials;

  const donutData = LOAD_STATUSES.map((s) => ({
    key: s,
    value: data.byStatus[s] ?? 0,
  })).filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("totalLoads")} value={c.total} icon={Package} accent="brand" />
        <StatCard label={t("activeLoads")} value={c.active} icon={Rocket} accent="amber" />
        <StatCard label={t("delivered")} value={c.delivered} icon={CheckCircle2} accent="emerald" />
        <StatCard
          label={t("availableDrivers")}
          value={`${c.driversAvailable}/${c.driversTotal}`}
          icon={UserCheck}
          accent="cyan"
        />
      </div>

      {showFin && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label={t("totalRevenue")} value={money(f.revenue)} icon={DollarSign} accent="emerald" />
          <StatCard label={t("margin")} value={money(f.margin)} icon={TrendingUp} accent="brand" />
          <StatCard label={t("avgRate")} value={money(f.avgRate)} icon={Package} accent="purple" />
          <StatCard
            label={t("outstanding")}
            value={money(f.outstanding)}
            icon={AlertCircle}
            accent="red"
            hint={`${f.unpaidCount} ${t("unpaid")}`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {showFin && (
          <div className="card p-5 lg:col-span-2">
            <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">
              {t("revenueByMonth")}
            </h2>
            <BarChart data={data.revenueByMonth} />
          </div>
        )}
        <div className={`card p-5 ${showFin ? "" : "lg:col-span-2"}`}>
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">
            {t("loadsByStatus")}
          </h2>
          {donutData.length > 0 ? (
            <DonutChart data={donutData} labelFor={(k) => t(k)} />
          ) : (
            <p className="text-sm text-slate-400">{t("noData")}</p>
          )}
        </div>
        {!showFin && (
          <div className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <TruckIcon size={18} /> {t("fleetUtilization")}
            </h2>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {c.trucksActive}/{c.trucksTotal}
            </div>
            <p className="text-sm text-slate-400">{t("trucks")}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Unassigned loads */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <AlertCircle size={16} className="text-amber-500" />
              {t("unassignedLoads")}
            </h2>
            <Link href="/dashboard/board" className="text-sm text-brand-600 hover:underline">
              {t("dispatchBoard")} →
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.unassignedList.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-400">{t("noData")}</p>
            )}
            {data.unassignedList.map((l: any) => (
              <Link key={l.id} href="/dashboard/loads" className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">{l.refNumber}</div>
                  <div className="text-sm text-slate-500">{l.origin} → {l.destination}</div>
                </div>
                <span className={`badge ${LOAD_STATUS_COLORS[l.status]}`}>{t(l.status)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Top drivers */}
        <div className="card">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <Trophy size={16} className="text-amber-500" />
              {t("topDrivers")}
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.topDrivers.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-400">{t("noData")}</p>
            )}
            {data.topDrivers.map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{d.name}</div>
                    <div className="text-xs text-slate-400">{d.loads} {t("loads").toLowerCase()}</div>
                  </div>
                </div>
                {data.canFinancials && (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{money(d.revenue)}</span>
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
    await fetch(`/api/loads/${loadId}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast.success(t("updatedOk"));
    reload();
  }

  async function setMyStatus(status: string) {
    if (!data.driver) return;
    await fetch(`/api/drivers/${data.driver.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast.success(t("updatedOk"));
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label={t("myLoads")} value={data.counts.total} icon={Package} accent="brand" />
        <StatCard label={t("activeLoads")} value={data.counts.active} icon={Rocket} accent="amber" />
        <StatCard label={t("delivered")} value={data.counts.delivered} icon={CheckCircle2} accent="emerald" />
      </div>

      {/* My availability */}
      {data.driver && (
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">{t("myStatus")}</h2>
          <div className="flex flex-wrap gap-2">
            {DRIVER_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setMyStatus(s)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  data.driver.status === s
                    ? DRIVER_STATUS_COLORS[s]
                    : "border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                }`}
              >
                {t(s)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current load */}
      <div className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <MapPin size={18} className="text-brand-500" /> {t("currentLoad")}
        </h2>
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
              <div className="text-center">
                <div className="font-semibold text-slate-900 dark:text-white">{cur.origin}</div>
                <div className="text-xs text-slate-400">{fmtDate(cur.pickupDate)}</div>
              </div>
              <div className="flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600" />
              <TruckIcon size={20} className="text-brand-500" />
              <div className="flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600" />
              <div className="text-center">
                <div className="font-semibold text-slate-900 dark:text-white">{cur.destination}</div>
                <div className="text-xs text-slate-400">{fmtDate(cur.deliveryDate)}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {["IN_TRANSIT", "DELIVERED"].map((s) => (
                <button key={s} onClick={() => updateStatus(cur.id, s)} className="btn-primary">
                  {t(s)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-slate-400">{t("noCurrentLoad")}</p>
        )}
      </div>

      {/* Recent */}
      <div className="card">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">{t("myLoads")}</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.recent.map((l: any) => (
            <div key={l.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-slate-900 dark:text-white">{l.refNumber}</div>
                <div className="text-sm text-slate-500">{l.origin} → {l.destination}</div>
              </div>
              <span className={`badge ${LOAD_STATUS_COLORS[l.status]}`}>{t(l.status)}</span>
            </div>
          ))}
          {data.recent.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-400">{t("noData")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
