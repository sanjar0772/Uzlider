"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, User, Truck as TruckIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import { PageHeader, StatCard, EmptyState, Skeleton } from "@/components/ui";

const STATUS_STYLE: Record<string, string> = {
  expired: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  soon: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
};

export default function CompliancePage() {
  const { t } = useI18n();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/compliance").then((r) => r.json()).then((d) => { setItems(d.items ?? []); setLoading(false); });
  }, []);

  const expired = items.filter((i) => i.status === "expired").length;
  const soon = items.filter((i) => i.status === "soon").length;
  const ok = items.filter((i) => i.status === "ok").length;

  return (
    <div className="space-y-4">
      <PageHeader title={t("compliance")} subtitle={t("documents")} />

      <div className="grid grid-cols-3 gap-4">
        <StatCard label={t("expired")} value={expired} icon={ShieldAlert} accent="red" />
        <StatCard label={t("expiringSoon")} value={soon} icon={ShieldAlert} accent="amber" />
        <StatCard label={t("allValid")} value={ok} icon={ShieldCheck} accent="emerald" />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={ShieldCheck} title={t("allValid")} hint={t("documents")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="th">{t("name")}</th>
                  <th className="th">{t("documents")}</th>
                  <th className="th">{t("expiresIn")}</th>
                  <th className="th text-right">{t("status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((it, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="td">
                      <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                        {it.entity === "driver" ? <User size={15} className="text-slate-400" /> : <TruckIcon size={15} className="text-slate-400" />}
                        {it.name}
                      </div>
                    </td>
                    <td className="td">{it.doc}</td>
                    <td className="td tabular-nums">{fmtDate(it.date)}</td>
                    <td className="td text-right">
                      <span className={`badge ${STATUS_STYLE[it.status]}`}>
                        {it.status === "expired"
                          ? `${t("expired")} (${Math.abs(it.days)} ${t("daysLeft")})`
                          : it.status === "soon"
                          ? `${it.days} ${t("daysLeft")}`
                          : t("allValid")}
                      </span>
                    </td>
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
