"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Truck as TruckIcon, DollarSign, Gauge, Fuel as FuelIcon,
  Wrench, Package, Receipt, FileText, User,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { can, TRUCK_STATUS_COLORS, LOAD_STATUS_COLORS, MAINTENANCE_TYPE_COLORS } from "@/lib/constants";
import { money, num, fmtDate } from "@/lib/format";
import { StatCard, Skeleton, EmptyState } from "@/components/ui";
import DocumentsPanel from "@/components/DocumentsPanel";

export default function TruckDetailPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/trucks/${id}`).then((r) => r.json());
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
  if (!data?.truck) return <div className="card p-8 text-center text-slate-400">{t("noData")}</div>;

  const { truck, loads, maintenance, fuel, expenses, metrics } = data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowLeft size={18} /></button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{truck.unitNumber}</h1>
              <span className={`badge ${TRUCK_STATUS_COLORS[truck.status]}`}>{t(truck.status)}</span>
            </div>
            <p className="text-sm text-slate-500">{[truck.make, truck.model, truck.year].filter(Boolean).join(" ")}</p>
          </div>
        </div>
        <Link href="/dashboard/trucks" className="btn-secondary">{t("trucks")}</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t("revenue")} value={money(metrics.revenue)} icon={DollarSign} accent="emerald" />
        <StatCard label={t("netProfit")} value={money(metrics.netContribution)} icon={DollarSign} accent={metrics.netContribution >= 0 ? "brand" : "red"} />
        <StatCard label={t("fleetMpg")} value={metrics.realMpg ?? truck.mpg ?? "—"} icon={FuelIcon} accent="amber" hint={metrics.realMpg ? "real" : undefined} />
        <StatCard label={t("trueCostPerMile")} value={`$${metrics.costPerMile.toFixed(2)}`} icon={Gauge} accent="red" />
        <StatCard label={t("exp_FUEL")} value={money(metrics.fuelCost)} icon={FuelIcon} accent="amber" />
        <StatCard label={t("maintenance")} value={money(metrics.maintCost)} icon={Wrench} accent="cyan" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Loads */}
          <Section icon={Package} title={t("loads")} count={metrics.loadsCount}>
            {loads.length === 0 ? <EmptyState icon={Package} title={t("noData")} /> : (
              <MiniTable head={[t("refNumber"), t("lane"), t("status"), t("rate")]}>
                {loads.slice(0, 12).map((l: any) => (
                  <tr key={l.id} className="border-t border-slate-50 hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/30">
                    <td className="td"><Link href={`/dashboard/loads/${l.id}`} className="font-medium text-brand-600 hover:underline">{l.refNumber}</Link></td>
                    <td className="td text-slate-500">{l.origin} → {l.destination}</td>
                    <td className="td"><span className={`badge ${LOAD_STATUS_COLORS[l.status]}`}>{t(l.status)}</span></td>
                    <td className="td text-right tabular-nums">{money(l.rate)}</td>
                  </tr>
                ))}
              </MiniTable>
            )}
          </Section>

          {/* Maintenance */}
          <Section icon={Wrench} title={t("repairLog")} count={maintenance.length}>
            {maintenance.length === 0 ? <EmptyState icon={Wrench} title={t("noData")} /> : (
              <MiniTable head={[t("date"), t("maintenanceType"), t("description"), t("cost")]}>
                {maintenance.slice(0, 10).map((m: any) => (
                  <tr key={m.id} className="border-t border-slate-50 dark:border-slate-800/50">
                    <td className="td text-slate-500">{fmtDate(m.date)}</td>
                    <td className="td"><span className={`badge ${MAINTENANCE_TYPE_COLORS[m.type] ?? ""}`}>{t(`mnt_${m.type}`)}</span></td>
                    <td className="td text-slate-700 dark:text-slate-200">{m.description}</td>
                    <td className="td text-right tabular-nums">{m.cost ? money(m.cost) : "—"}</td>
                  </tr>
                ))}
              </MiniTable>
            )}
          </Section>

          {/* Fuel */}
          <Section icon={FuelIcon} title={t("fuelLog")} count={fuel.length}>
            {fuel.length === 0 ? <EmptyState icon={FuelIcon} title={t("noData")} /> : (
              <MiniTable head={[t("date"), t("state"), t("gallons"), t("total")]}>
                {fuel.slice(0, 10).map((f: any) => (
                  <tr key={f.id} className="border-t border-slate-50 dark:border-slate-800/50">
                    <td className="td text-slate-500">{fmtDate(f.date)}</td>
                    <td className="td">{f.state ?? "—"}</td>
                    <td className="td text-right tabular-nums">{f.gallons.toFixed(1)}</td>
                    <td className="td text-right tabular-nums">{money(f.total)}</td>
                  </tr>
                ))}
              </MiniTable>
            )}
          </Section>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">{t("details")}</h3>
            <div className="space-y-2 text-sm">
              <Row icon={User} label={t("assignedDriver")} value={truck.driver?.name ?? "—"} />
              <Row icon={TruckIcon} label={t("plate")} value={truck.plate ?? "—"} />
              <Row icon={Gauge} label={t("odometer")} value={truck.odometer ? num(truck.odometer) : "—"} />
              <Row icon={Package} label={t("vin")} value={truck.vin ?? "—"} />
              <Row icon={Receipt} label={t("expenses")} value={money(metrics.expenseCost)} />
              <Row icon={FuelIcon} label={t("totalGallons")} value={num(metrics.fuelGallons)} />
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><FileText size={16} /> {t("documents")}</h3>
            <DocumentsPanel owner={{ truckId: id }} canManage={can.manageDocuments(role)} compact />
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

function Row({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-400"><Icon size={14} /> {label}</span>
      <span className="font-medium text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}
