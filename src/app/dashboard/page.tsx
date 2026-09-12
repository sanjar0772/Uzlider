"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { LOAD_STATUS_COLORS } from "@/lib/constants";

type Load = {
  id: string;
  refNumber: string;
  origin: string;
  destination: string;
  status: string;
  rate: number | null;
  driver: { name: string } | null;
};

export default function DashboardPage() {
  const { t } = useI18n();
  const [loads, setLoads] = useState<Load[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<number | null>(null);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setRole(me.user?.role ?? "");
      const ld = await fetch("/api/loads").then((r) => r.json());
      setLoads(ld.loads ?? []);
      if (me.user?.role !== "DRIVER") {
        const dr = await fetch("/api/drivers").then((r) => r.json());
        setAvailableDrivers(
          (dr.drivers ?? []).filter((d: any) => d.status === "AVAILABLE").length
        );
      }
      setLoading(false);
    })();
  }, []);

  const total = loads.length;
  const active = loads.filter((l) =>
    ["NEW", "ASSIGNED", "IN_TRANSIT"].includes(l.status)
  ).length;
  const delivered = loads.filter((l) => l.status === "DELIVERED").length;

  const isDriver = role === "DRIVER";

  const stats = [
    { label: isDriver ? t("myLoads") : t("totalLoads"), value: total, icon: "📦" },
    { label: t("activeLoads"), value: active, icon: "🚀" },
    { label: t("delivered"), value: delivered, icon: "✅" },
    ...(!isDriver
      ? [
          {
            label: t("availableDrivers"),
            value: availableDrivers ?? 0,
            icon: "🟢",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
        <p className="text-slate-500">
          {t("welcome")} 👋
        </p>
      </div>

      {loading ? (
        <p className="text-slate-400">{t("loading")}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-3xl font-bold">{s.value}</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="font-semibold">
                {isDriver ? t("myLoads") : t("recentLoads")}
              </h2>
              <Link
                href="/dashboard/loads"
                className="text-sm text-brand-600 hover:underline"
              >
                {t("loads")} →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {loads.slice(0, 6).map((l) => (
                <Link
                  key={l.id}
                  href="/dashboard/loads"
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <div className="font-medium">{l.refNumber}</div>
                    <div className="text-sm text-slate-500">
                      {l.origin} → {l.destination}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {l.rate != null && (
                      <span className="hidden text-sm font-medium text-slate-700 sm:block">
                        ${l.rate.toLocaleString()}
                      </span>
                    )}
                    <span className={`badge ${LOAD_STATUS_COLORS[l.status]}`}>
                      {t(l.status)}
                    </span>
                  </div>
                </Link>
              ))}
              {loads.length === 0 && (
                <p className="px-4 py-6 text-center text-slate-400">
                  {t("noData")}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
