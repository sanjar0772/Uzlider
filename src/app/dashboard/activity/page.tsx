"use client";

import { useEffect, useState } from "react";
import { History, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { fmtDateTime } from "@/lib/format";
import { PageHeader, EmptyState, Skeleton } from "@/components/ui";

const ACTION_ICON: Record<string, any> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
  status_changed: RefreshCw,
};
const ACTION_COLOR: Record<string, string> = {
  created: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  updated: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  deleted: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300",
  status_changed: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
};

export default function ActivityPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity").then((r) => r.json()).then((d) => { setItems(d.activity ?? []); setLoading(false); });
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title={t("activity")} subtitle={t("recentActivity")} />

      <div className="card">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={History} title={t("noData")} />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((a) => {
              const Icon = ACTION_ICON[a.action] ?? History;
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${ACTION_COLOR[a.action] ?? "bg-slate-100 text-slate-500"}`}>
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-900 dark:text-white">
                      <span className="font-medium">{a.actorName}</span>{" "}
                      <span className="text-slate-500">{a.action.replace("_", " ")}</span>{" "}
                      <span className="text-slate-500">{a.entity}</span>{" "}
                      {a.entityRef && <span className="font-medium text-brand-600 dark:text-brand-400">{a.entityRef}</span>}
                      {a.detail && <span className="text-slate-400"> {a.detail}</span>}
                    </div>
                  </div>
                  <div className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(a.createdAt)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
