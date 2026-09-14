"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ShieldAlert, Package, FileClock, Wrench, TrendingDown, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Alert = { key: string; tone: string; title: string; href: string };

const TONE_ICON: Record<string, any> = {
  danger: ShieldAlert,
  warning: Wrench,
  info: Package,
  success: Info,
};
const TONE_COLOR: Record<string, string> = {
  danger: "text-red-500",
  warning: "text-amber-500",
  info: "text-brand-500",
  success: "text-emerald-500",
};

// Turn "3::expired::compliance" into "3 Expired — Documents" using i18n.
function render(title: string, t: (k: string) => string): string {
  const [count, key, suffix] = title.split("::");
  const base = `${count} ${key ? t(key) : ""}`.trim();
  return suffix ? `${base} — ${t(suffix)}` : base;
}

function iconFor(a: Alert) {
  if (a.key.startsWith("overdue")) return FileClock;
  if (a.key.startsWith("maint")) return Wrench;
  if (a.key.startsWith("losing")) return TrendingDown;
  return TONE_ICON[a.tone] ?? Info;
}

export default function Notifications() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const fetchAlerts = async () => {
      const res = await fetch("/api/notifications").then((r) => r.json()).catch(() => null);
      if (active && res?.alerts) setAlerts(res.alerts);
    };
    fetchAlerts();
    const id = setInterval(fetchAlerts, 60000); // refresh every minute
    return () => { active = false; clearInterval(id); };
  }, []);

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
            {alerts.map((a) => {
              const Icon = iconFor(a);
              return (
                <Link key={a.key} href={a.href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <Icon size={16} className={TONE_COLOR[a.tone] ?? "text-slate-400"} />
                  <span className="text-sm text-slate-700 dark:text-slate-200">{render(a.title, t)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
