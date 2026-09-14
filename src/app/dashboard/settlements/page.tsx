"use client";

import { useEffect, useState, useCallback } from "react";
import { Wallet, ChevronDown, ChevronRight, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageHeader, StatCard, Skeleton, EmptyState } from "@/components/ui";
import { money } from "@/lib/format";

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function SettlementsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/settlements?from=${from}&to=${to}`).then((r) => r.json());
    setRows(res.settlements ?? []);
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const totalGross = rows.reduce((s, r) => s + r.gross, 0);
  const totalDed = rows.reduce((s, r) => s + (r.deductions ?? 0), 0);
  const totalNet = rows.reduce((s, r) => s + (r.net ?? r.gross), 0);

  return (
    <div className="space-y-4">
      <PageHeader title={t("driverSettlements")} subtitle={t("settlementHint")} />

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div><label className="label">{t("from")}</label><input type="date" className="input !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="label">{t("to")}</label><input type="date" className="input !w-auto" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("grossPay")} value={money(totalGross)} icon={Wallet} accent="brand" />
        <StatCard label={t("deductions")} value={money(totalDed)} icon={Wallet} accent="red" />
        <StatCard label={t("netPay")} value={money(totalNet)} icon={Wallet} accent="emerald" />
      </div>

      {loading ? (
        <div className="card"><div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div></div>
      ) : rows.length === 0 ? (
        <div className="card"><EmptyState icon={Users} title={t("noData")} hint={t("settlementHint")} /></div>
      ) : (
        <div className="space-y-2">
          {rows.map((s) => {
            const open = expanded === s.driverId;
            return (
              <div key={s.driverId} className="card overflow-hidden">
                <button
                  onClick={() => setExpanded(open ? null : s.driverId)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-white">{s.name}</div>
                    <div className="text-xs text-slate-400">{s.count} {t("loadsDelivered").toLowerCase()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">{t("grossPay")} {money(s.gross)}{s.deductions ? ` − ${money(s.deductions)}` : ""}</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">{money(s.net ?? s.gross)}</div>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-slate-100 dark:border-slate-800">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                          <th className="px-4 py-2">{t("refNumber")}</th>
                          <th className="px-4 py-2">{t("lane")}</th>
                          <th className="px-4 py-2">{t("deliveryDate")}</th>
                          <th className="px-4 py-2 text-right">{t("driverPay")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.loads.map((l: any, i: number) => (
                          <tr key={i} className="border-t border-slate-50 dark:border-slate-800/50">
                            <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200">{l.refNumber}</td>
                            <td className="px-4 py-2 text-slate-500">{l.origin} → {l.destination}</td>
                            <td className="px-4 py-2 text-slate-500">{l.deliveryDate ? new Date(l.deliveryDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-slate-900 dark:text-white">{money(l.driverPay)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
