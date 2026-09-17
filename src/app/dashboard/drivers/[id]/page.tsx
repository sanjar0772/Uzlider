"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, DollarSign, Package, Gauge, ShieldCheck, Fuel as FuelIcon,
  FileText, Phone, Mail, Truck as TruckIcon, Printer, Award,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { can, DRIVER_STATUS_COLORS, LOAD_STATUS_COLORS } from "@/lib/constants";
import { money, num, fmtDate } from "@/lib/format";
import { StatCard, Skeleton, EmptyState } from "@/components/ui";
import DocumentsPanel from "@/components/DocumentsPanel";
import { printSettlement } from "@/lib/pdf";

const EXPIRY_TONE: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  soon: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  expired: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  none: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

export default function DriverDetailPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/drivers/${id}`).then((r) => r.json());
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
  if (!data?.driver) return <div className="card p-8 text-center text-slate-400">{t("noData")}</div>;

  const { driver, loads, fuel, compliance, scorecard, settlement } = data;
  const canViewSettle = can.viewSettlements(role);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowLeft size={18} /></button>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            {driver.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{driver.name}</h1>
              <span className={`badge ${DRIVER_STATUS_COLORS[driver.status]}`}>{t(driver.status)}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              {driver.phone && <span className="flex items-center gap-1"><Phone size={12} /> {driver.phone}</span>}
              {driver.email && <span className="flex items-center gap-1"><Mail size={12} /> {driver.email}</span>}
              {driver.truck && <span className="flex items-center gap-1"><TruckIcon size={12} /> {driver.truck.unitNumber}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {canViewSettle && (
            <button onClick={() => printSettlement(driver, settlement, loads, null)} className="btn-secondary"><Printer size={16} /> <span className="hidden sm:inline">{t("settlements")}</span></button>
          )}
          <Link href="/dashboard/drivers" className="btn-secondary">{t("drivers")}</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t("loads")} value={num(scorecard.loads)} icon={Package} accent="brand" />
        <StatCard label={t("revenue")} value={money(scorecard.revenue)} icon={DollarSign} accent="emerald" />
        <StatCard label={t("revenuePerMile")} value={`$${scorecard.revenuePerMile.toFixed(2)}`} icon={Gauge} accent="cyan" />
        <StatCard label={t("deadheadPct")} value={`${scorecard.deadheadPct}%`} icon={Gauge} accent="amber" />
        <StatCard label={t("onTimePct")} value={scorecard.onTimePct == null ? "—" : `${scorecard.onTimePct}%`} icon={Award} accent="purple" />
        {canViewSettle && <StatCard label={t("netPay")} value={money(settlement.netPay)} icon={DollarSign} accent="emerald" />}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Section icon={Package} title={t("loads")} count={scorecard.loads}>
            {loads.length === 0 ? <EmptyState icon={Package} title={t("noData")} /> : (
              <MiniTable head={[t("refNumber"), t("lane"), t("status"), t("driverPay")]}>
                {loads.slice(0, 12).map((l: any) => (
                  <tr key={l.id} className="border-t border-slate-50 hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/30">
                    <td className="td"><Link href={`/dashboard/loads/${l.id}`} className="font-medium text-brand-600 hover:underline">{l.refNumber}</Link></td>
                    <td className="td text-slate-500">{l.origin} → {l.destination}</td>
                    <td className="td"><span className={`badge ${LOAD_STATUS_COLORS[l.status]}`}>{t(l.status)}</span></td>
                    <td className="td text-right tabular-nums">{money(l.driverPay)}</td>
                  </tr>
                ))}
              </MiniTable>
            )}
          </Section>

          {fuel.length > 0 && (
            <Section icon={FuelIcon} title={t("fuelLog")} count={fuel.length}>
              <MiniTable head={[t("date"), t("state"), t("gallons"), t("total")]}>
                {fuel.slice(0, 8).map((f: any) => (
                  <tr key={f.id} className="border-t border-slate-50 dark:border-slate-800/50">
                    <td className="td text-slate-500">{fmtDate(f.date)}</td>
                    <td className="td">{f.state ?? "—"}</td>
                    <td className="td text-right tabular-nums">{f.gallons.toFixed(1)}</td>
                    <td className="td text-right tabular-nums">{money(f.total)}</td>
                  </tr>
                ))}
              </MiniTable>
            </Section>
          )}
        </div>

        <div className="space-y-5">
          {/* Compliance */}
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><ShieldCheck size={16} /> {t("compliance")}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{t("cdlExpiry")}</span>
                <span className={`badge ${EXPIRY_TONE[compliance.cdl.status]}`}>{compliance.cdl.date ? fmtDate(compliance.cdl.date) : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{t("medicalExpiry")}</span>
                <span className={`badge ${EXPIRY_TONE[compliance.medical.status]}`}>{compliance.medical.date ? fmtDate(compliance.medical.date) : "—"}</span>
              </div>
              {driver.availableHours != null && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t("availableHours")}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{driver.availableHours} {t("hours")}</span>
                </div>
              )}
              {driver.homeBase && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t("homeBase")}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{driver.homeBase}</span>
                </div>
              )}
            </div>
          </div>

          {canViewSettle && (
            <div className="card p-5">
              <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">{t("settlements")}</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">{t("grossPay")}</span><span className="tabular-nums">{money(settlement.grossPay)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t("deductions")}</span><span className="tabular-nums text-red-500">−{money(settlement.deductions)}</span></div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold dark:border-slate-800"><span>{t("netPay")}</span><span className="tabular-nums text-emerald-600 dark:text-emerald-400">{money(settlement.netPay)}</span></div>
              </div>
            </div>
          )}

          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><FileText size={16} /> {t("documents")}</h3>
            <DocumentsPanel owner={{ driverId: id }} canManage={can.manageDocuments(role)} compact />
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, count, children }: any) {
  return (
    <div className="card p-5">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
        <Icon size={16} /> {title} <span className="text-sm font-normal text-slate-400">· {count}</span>
      </h3>
      {children}
    </div>
  );
}

function MiniTable({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-400">{head.map((h, i) => <th key={i} className={`px-3 py-2 ${i === head.length - 1 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
