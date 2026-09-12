"use client";

import { useEffect, useState, useCallback } from "react";
import { Columns3, GanttChartSquare } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { can, LOAD_STATUS_COLORS } from "@/lib/constants";
import { money } from "@/lib/format";
import { PageHeader, Skeleton } from "@/components/ui";
import DispatchTimeline from "@/components/DispatchTimeline";

const COLUMNS = ["NEW", "ASSIGNED", "IN_TRANSIT", "DELIVERED"] as const;

export default function BoardPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [role, setRole] = useState("");
  const [loads, setLoads] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"board" | "timeline">("board");

  const load = useCallback(async () => {
    const res = await fetch("/api/loads").then((r) => r.json());
    setLoads(res.loads ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      setRole(me.user?.role ?? "");
      const dr = await fetch("/api/drivers").then((r) => r.json());
      setDrivers(dr.drivers ?? []);
    })();
    load();
  }, [load]);

  const canEdit = can.editLoad(role);
  const canUpdate = can.updateStatus(role);

  async function move(l: any, status: string) {
    await fetch(`/api/loads/${l.id}/updates`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    toast.success(t("updatedOk"));
    load();
  }

  async function assign(l: any, driverId: string) {
    await fetch(`/api/loads/${l.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId, status: driverId ? "ASSIGNED" : "NEW" }),
    });
    toast.success(t("updatedOk"));
    load();
  }

  const showFin = can.viewFinancials(role);

  return (
    <div className="space-y-4">
      <PageHeader title={t("dispatchBoard")} subtitle={`${loads.length} ${t("loads").toLowerCase()}`}>
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
          <button onClick={() => setView("board")} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${view === "board" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300"}`}><Columns3 size={15} /> {t("dispatchBoard")}</button>
          <button onClick={() => setView("timeline")} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${view === "timeline" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300"}`}><GanttChartSquare size={15} /> Timeline</button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((c) => <Skeleton key={c} className="h-64" />)}
        </div>
      ) : view === "timeline" ? (
        <DispatchTimeline loads={loads} drivers={drivers} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = loads.filter((l) => l.status === col);
            const idx = COLUMNS.indexOf(col);
            const next = COLUMNS[idx + 1];
            return (
              <div key={col} className="flex flex-col rounded-xl bg-slate-100 dark:bg-slate-900/50">
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className={`badge ${LOAD_STATUS_COLORS[col]}`}>{t(col)}</span>
                  <span className="text-sm font-semibold text-slate-400">{items.length}</span>
                </div>
                <div className="flex-1 space-y-2 p-2">
                  {items.map((l) => (
                    <div key={l.id} className="card p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-white">{l.refNumber}</span>
                        {showFin && <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{money(l.rate)}</span>}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{l.origin} → {l.destination}</div>
                      <div className="mt-1 text-xs text-slate-400">{l.customer?.name ?? l.broker ?? ""}</div>

                      {col === "NEW" && canEdit ? (
                        <select className="input mt-2 !py-1 text-xs" value={l.driverId ?? ""} onChange={(e) => assign(l, e.target.value)}>
                          <option value="">{t("assignDriver")}...</option>
                          {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      ) : (
                        l.driver && <div className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">👤 {l.driver.name}</div>
                      )}

                      {next && canUpdate && (
                        <button onClick={() => move(l, next)} className="mt-2 w-full rounded-md bg-slate-100 py-1 text-xs font-medium text-slate-600 hover:bg-brand-600 hover:text-white dark:bg-slate-800 dark:text-slate-300">
                          → {t(next)}
                        </button>
                      )}
                    </div>
                  ))}
                  {items.length === 0 && <div className="py-8 text-center text-xs text-slate-400">—</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
