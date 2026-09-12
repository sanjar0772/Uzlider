"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { LOAD_STATUS_COLORS } from "@/lib/constants";

const DAYS = 7;
const BAR_COLOR: Record<string, string> = {
  NEW: "bg-slate-400",
  ASSIGNED: "bg-brand-500",
  IN_TRANSIT: "bg-amber-500",
  DELIVERED: "bg-emerald-500",
  CANCELLED: "bg-red-400",
};

export default function DispatchTimeline({
  loads,
  drivers,
}: {
  loads: any[];
  drivers: any[];
}) {
  const { t } = useI18n();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();
  const dayMs = 86400000;
  const endMs = startMs + DAYS * dayMs;

  const days = Array.from({ length: DAYS }, (_, i) => new Date(startMs + i * dayMs));

  function barFor(l: any) {
    const p = l.pickupDate ? new Date(l.pickupDate).getTime() : startMs;
    const d = l.deliveryDate ? new Date(l.deliveryDate).getTime() : p + dayMs;
    const from = Math.max(p, startMs);
    const to = Math.min(Math.max(d, from + dayMs / 2), endMs);
    if (to <= startMs || from >= endMs) return null;
    const left = ((from - startMs) / (DAYS * dayMs)) * 100;
    const width = Math.max(((to - from) / (DAYS * dayMs)) * 100, 6);
    return { left, width };
  }

  const rows = [
    { id: "__un", name: t("unassigned"), loads: loads.filter((l) => !l.driverId && l.status !== "DELIVERED" && l.status !== "CANCELLED") },
    ...drivers.map((d) => ({ id: d.id, name: d.name, loads: loads.filter((l) => l.driverId === d.id) })),
  ];

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* header */}
          <div className="flex border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="w-40 shrink-0 px-3 py-2 text-xs font-semibold uppercase text-slate-400">{t("drivers")}</div>
            <div className="flex flex-1">
              {days.map((d, i) => (
                <div key={i} className="flex-1 border-l border-slate-100 px-2 py-2 text-center dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                  <div className="text-[10px] text-slate-400">{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                </div>
              ))}
            </div>
          </div>
          {/* rows */}
          {rows.map((row) => (
            <div key={row.id} className="flex border-b border-slate-100 dark:border-slate-800">
              <div className="flex w-40 shrink-0 items-center px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                {row.id === "__un" ? <span className="text-amber-600 dark:text-amber-400">{row.name}</span> : row.name}
              </div>
              <div className="relative flex-1" style={{ minHeight: 44 }}>
                {/* day grid lines */}
                <div className="absolute inset-0 flex">
                  {days.map((_, i) => <div key={i} className="flex-1 border-l border-slate-50 dark:border-slate-800/50" />)}
                </div>
                {/* load bars */}
                {row.loads.map((l, idx) => {
                  const b = barFor(l);
                  if (!b) return null;
                  return (
                    <Link
                      key={l.id}
                      href={`/dashboard/loads/${l.id}`}
                      className={`absolute flex items-center gap-1 overflow-hidden rounded-md px-2 text-[11px] font-medium text-white shadow-sm hover:brightness-110 ${BAR_COLOR[l.status]}`}
                      style={{ left: `${b.left}%`, width: `${b.width}%`, top: 6 + (idx % 2) * 18, height: 16 }}
                      title={`${l.refNumber}: ${l.origin} → ${l.destination}`}
                    >
                      <span className="truncate">{l.refNumber}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
