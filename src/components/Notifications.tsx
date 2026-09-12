"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ShieldAlert, Package, FileClock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Alert = { icon: any; text: string; href: string; tone: string };

export default function Notifications() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const list: Alert[] = [];
      const stats = await fetch("/api/stats").then((r) => r.json()).catch(() => null);
      if (stats?.compliance) {
        const c = stats.compliance;
        if (c.expired > 0) list.push({ icon: ShieldAlert, text: `${c.expired} ${t("expired")} — ${t("documents")}`, href: "/dashboard/compliance", tone: "text-red-500" });
        if (c.expiringSoon > 0) list.push({ icon: ShieldAlert, text: `${c.expiringSoon} ${t("expiringSoon")} — ${t("documents")}`, href: "/dashboard/compliance", tone: "text-amber-500" });
      }
      if (stats?.counts?.unassigned > 0)
        list.push({ icon: Package, text: `${stats.counts.unassigned} ${t("unassignedLoads")}`, href: "/dashboard/board", tone: "text-brand-500" });
      const inv = await fetch("/api/invoices").then((r) => r.json()).catch(() => null);
      if (inv?.invoices) {
        const now = Date.now();
        const overdue = inv.invoices.filter((i: any) => i.status !== "PAID" && i.dueAt && new Date(i.dueAt).getTime() < now).length;
        if (overdue > 0) list.push({ icon: FileClock, text: `${overdue} ${t("OVERDUE")} — ${t("invoices")}`, href: "/dashboard/invoices", tone: "text-red-500" });
      }
      setAlerts(list);
    })();
  }, [t]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
        <Bell size={18} />
        {alerts.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{alerts.length}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-white">{t("needsAttention")}</div>
          <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {alerts.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">{t("healthy")} ✓</p>}
            {alerts.map((a, i) => {
              const Icon = a.icon;
              return (
                <Link key={i} href={a.href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <Icon size={16} className={a.tone} />
                  <span className="text-sm text-slate-700 dark:text-slate-200">{a.text}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
