"use client";

import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const FLOW = ["NEW", "ASSIGNED", "IN_TRANSIT", "DELIVERED"] as const;

export default function StatusStepper({ status }: { status: string }) {
  const { t } = useI18n();
  const cancelled = status === "CANCELLED";
  const idx = FLOW.indexOf(status as any);

  if (cancelled) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
        {t("CANCELLED")}
      </div>
    );
  }

  return (
    <div className="flex items-center">
      {FLOW.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                    ? "bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-500/20"
                    : "bg-slate-200 text-slate-400 dark:bg-slate-700"
                }`}
              >
                {done ? <Check size={15} /> : i + 1}
              </div>
              <span
                className={`mt-1 whitespace-nowrap text-[11px] font-medium ${
                  active ? "text-brand-600 dark:text-brand-400" : "text-slate-400"
                }`}
              >
                {t(s)}
              </span>
            </div>
            {i < FLOW.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 rounded ${
                  i < idx ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
