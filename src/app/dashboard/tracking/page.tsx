"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Radio, MapPin, Truck as TruckIcon, Phone, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { DRIVER_STATUS_COLORS } from "@/lib/constants";
import { PageHeader, EmptyState, Skeleton } from "@/components/ui";
import type { FleetDriver } from "@/components/FleetMap";

const FleetMap = dynamic(() => import("@/components/FleetMap"), {
  ssr: false,
  loading: () => <div className="skeleton h-[520px] rounded-xl" />,
});

function ago(iso?: string | null): string {
  if (!iso) return "—";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "hozir";
  if (mins < 60) return `${mins} daq`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} soat`;
  return `${Math.floor(h / 24)} kun`;
}

export default function TrackingPage() {
  const { t } = useI18n();
  const [fleet, setFleet] = useState<FleetDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/tracking").then((r) => r.json());
      setFleet(res.fleet ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 20_000); // auto-refresh every 20s
    return () => clearInterval(id);
  }, [load]);

  const online = fleet.filter(
    (d) =>
      d.updatedAt && Date.now() - new Date(d.updatedAt).getTime() < 10 * 60_000
  ).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("liveTracking")}
        subtitle={`${fleet.length} ${t("drivers").toLowerCase()} · ${online} ${t("online")}`}
      >
        <button onClick={load} className="btn-secondary" disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          {t("refresh")}
        </button>
      </PageHeader>

      {loading ? (
        <Skeleton className="h-[520px]" />
      ) : fleet.length === 0 ? (
        <div className="card">
          <EmptyState icon={Radio} title={t("noLiveDrivers")} hint={t("noLiveDriversHint")} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card overflow-hidden p-1.5 lg:col-span-2">
            <FleetMap fleet={fleet} height={520} />
          </div>
          <div className="card flex max-h-[520px] flex-col">
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <MapPin size={16} className="text-brand-500" /> {t("drivers")}
              </h2>
            </div>
            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {fleet.map((d) => (
                <div key={d.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {d.name}
                    </div>
                    <span className={`badge ${DRIVER_STATUS_COLORS[d.status]}`}>
                      {t(d.status)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    {d.truck && (
                      <span className="flex items-center gap-1">
                        <TruckIcon size={11} /> {d.truck}
                      </span>
                    )}
                    {d.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={11} /> {d.phone}
                      </span>
                    )}
                    <span className="text-slate-400">{ago(d.updatedAt)}</span>
                  </div>
                  {d.currentLoad && (
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <b className="text-slate-700 dark:text-slate-200">
                        {d.currentLoad.refNumber}
                      </b>{" "}
                      · {d.currentLoad.origin} → {d.currentLoad.destination}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
