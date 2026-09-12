"use client";

import { MapPin, Truck, Flag } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

const PROGRESS: Record<string, number> = {
  NEW: 0,
  ASSIGNED: 8,
  IN_TRANSIT: 52,
  DELIVERED: 100,
  CANCELLED: 0,
};

export default function RouteProgress({
  origin,
  destination,
  pickupDate,
  deliveryDate,
  status,
  miles,
}: {
  origin: string;
  destination: string;
  pickupDate?: string | null;
  deliveryDate?: string | null;
  status: string;
  miles?: number | null;
}) {
  const { t } = useI18n();
  const pct = PROGRESS[status] ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-brand-500" />
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">{origin}</div>
            <div className="text-xs text-slate-400">{fmtDate(pickupDate)}</div>
          </div>
        </div>
        <div className="text-center text-xs text-slate-400">
          {miles ? `${miles.toLocaleString()} mi` : ""}
        </div>
        <div className="flex items-center gap-2 text-right">
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">{destination}</div>
            <div className="text-xs text-slate-400">{fmtDate(deliveryDate)}</div>
          </div>
          <Flag size={18} className="text-emerald-500" />
        </div>
      </div>

      <div className="relative mt-5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="absolute left-0 top-0 h-1.5 rounded-full bg-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute -top-2.5 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-brand-600 text-white shadow transition-all"
          style={{ left: `${pct}%` }}
        >
          <Truck size={13} />
        </div>
      </div>
      <div className="mt-2 text-center text-xs font-medium text-brand-600 dark:text-brand-400">
        {t(status)}
      </div>
    </div>
  );
}
