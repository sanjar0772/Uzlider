"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft, Package, Building2, User, Truck as TruckIcon, FileText,
  Send, Clock, MapPin, Loader2, Printer, Plus, Trash2, Check, CircleDot,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { LOAD_STATUSES, LOAD_STATUS_COLORS, STOP_TYPES, can } from "@/lib/constants";
import { money, money2, fmtDate, fmtDateTime } from "@/lib/format";
import { computePnl, rpmBg, DEFAULT_SETTINGS, CostSettings } from "@/lib/finance";
import { printRateConfirmation, printDispatchSheet } from "@/lib/pdf";
import StatusStepper from "@/components/StatusStepper";
import RouteProgress from "@/components/RouteProgress";
import DocumentsPanel from "@/components/DocumentsPanel";
import { Skeleton } from "@/components/ui";
import { cityCoords } from "@/lib/usCities";

const LoadMap = dynamic(() => import("@/components/LoadMap"), {
  ssr: false,
  loading: () => <div className="skeleton h-[240px] rounded-xl" />,
});

export default function LoadDetailPage() {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [load, setLoad] = useState<any>(null);
  const [settings, setSettings] = useState<CostSettings>(DEFAULT_SETTINGS);
  const [companyName, setCompanyName] = useState("Uzlider Trucking");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  // check-call form
  const [ccStatus, setCcStatus] = useState("");
  const [ccLocation, setCcLocation] = useState("");
  const [ccNote, setCcNote] = useState("");
  const [saving, setSaving] = useState(false);

  // stop form
  const [stopOpen, setStopOpen] = useState(false);
  const [stopType, setStopType] = useState("DROPOFF");
  const [stopLoc, setStopLoc] = useState("");
  const [stopDate, setStopDate] = useState("");

  const fetchLoad = useCallback(async () => {
    const res = await fetch(`/api/loads/${id}`).then((r) => r.json());
    setLoad(res.load);
    if (res.load) setCcStatus(res.load.status);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    (async () => {
      const [me, st] = await Promise.all([
        fetch("/api/auth/me").then((r) => r.json()),
        fetch("/api/settings").then((r) => r.json()).catch(() => ({})),
      ]);
      setRole(me.user?.role ?? "");
      if (st.settings) {
        setSettings(st.settings);
        if (st.settings.companyName) setCompanyName(st.settings.companyName);
      }
    })();
    fetchLoad();
  }, [fetchLoad]);

  async function addUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/loads/${id}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: ccStatus, location: ccLocation, note: ccNote }),
    });
    setSaving(false);
    setCcLocation("");
    setCcNote("");
    toast.success(t("updatedOk"));
    fetchLoad();
  }

  async function addStop(e: React.FormEvent) {
    e.preventDefault();
    if (!stopLoc.trim()) return;
    const res = await fetch(`/api/loads/${id}/stops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: stopType, location: stopLoc, scheduledAt: stopDate || null }),
    });
    if (res.ok) {
      setStopLoc(""); setStopDate(""); setStopOpen(false);
      toast.success(t("createdOk"));
      fetchLoad();
    } else toast.error(t("somethingWrong"));
  }

  async function completeStop(stopId: string) {
    await fetch(`/api/loads/${id}/stops/${stopId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedAt: new Date().toISOString() }),
    });
    fetchLoad();
  }

  async function removeStop(stopId: string) {
    await fetch(`/api/loads/${id}/stops/${stopId}`, { method: "DELETE" });
    toast.success(t("deletedOk"));
    fetchLoad();
  }

  if (loading)
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div>;
  if (!load)
    return <div className="card p-8 text-center text-slate-400">{t("noData")}</div>;

  const showFin = can.viewFinancials(role);
  const canUpdate = can.updateStatus(role);
  const p = computePnl(load, settings, load.truck?.mpg ?? null);
  const hasCoords = cityCoords(load.origin) && cityCoords(load.destination);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowLeft size={18} /></button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{load.refNumber}</h1>
              <span className={`badge ${LOAD_STATUS_COLORS[load.status]}`}>{t(load.status)}</span>
            </div>
            <p className="text-sm text-slate-500">{load.customer?.name ?? load.broker ?? ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {can.viewFinancials(role) && (
            <button onClick={() => printRateConfirmation(load, companyName)} className="btn-secondary" title={t("rateConfirmation")}>
              <Printer size={16} /> <span className="hidden sm:inline">{t("rateConfirmation")}</span>
            </button>
          )}
          <button onClick={() => printDispatchSheet(load, companyName)} className="btn-secondary" title={t("dispatchSheet")}>
            <Printer size={16} /> <span className="hidden sm:inline">{t("dispatchSheet")}</span>
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="card px-5 py-4">
        <StatusStepper status={load.status} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: route, map, P&L */}
        <div className="space-y-5 lg:col-span-2">
          <RouteProgress
            origin={load.origin} destination={load.destination}
            pickupDate={load.pickupDate} deliveryDate={load.deliveryDate}
            status={load.status} miles={load.miles}
          />

          {hasCoords && (
            <div className="card overflow-hidden p-1.5">
              <LoadMap loads={[load]} height={240} />
            </div>
          )}

          {showFin && (
            <div className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white">{t("pnl")}</h3>
                <div className="flex gap-2">
                  <span className={`badge ${rpmBg(p.loadedRpm, settings.targetRpm)}`}>{t("loadedRpm")} ${p.loadedRpm.toFixed(2)}</span>
                  {p.allInRpm > 0 && p.allInRpm !== p.loadedRpm && (
                    <span className={`badge ${rpmBg(p.allInRpm, settings.targetRpm)}`}>{t("allInRpm")} ${p.allInRpm.toFixed(2)}</span>
                  )}
                </div>
              </div>
              <PnlRow label={t("grossRevenue")} value={p.revenue} sign="+" />
              <PnlRow label={t("driverPayTotal")} value={p.driverPay} sign="-" />
              <PnlRow label={`${t("fuelCost")} (${t("est")})`} value={p.fuelCost} sign="-" />
              <PnlRow label={t("fixedCost")} value={p.fixedCost} sign="-" />
              {p.lumper > 0 && <PnlRow label={t("lumper")} value={p.lumper} sign="-" />}
              <div className="my-1.5 border-t border-slate-200 dark:border-slate-700" />
              <PnlRow label={`${t("netProfit")} · ${p.marginPct.toFixed(0)}%`} value={p.netProfit} strong sign={p.netProfit >= 0 ? "+" : "-"} />
            </div>
          )}
        </div>

        {/* Right: details + check calls */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">{t("details")}</h3>
            <div className="space-y-2.5 text-sm">
              <DetailRow icon={Building2} label={t("customer")} value={load.customer?.name ?? load.broker ?? "—"} />
              <DetailRow icon={User} label={t("driver")} value={load.driver?.name ?? t("unassigned")} />
              <DetailRow icon={TruckIcon} label={t("truck")} value={load.truck?.unitNumber ?? "—"} />
              <DetailRow icon={Package} label={t("equipment")} value={t(load.equipment)} />
              <DetailRow icon={Package} label={t("commodity")} value={load.commodity ?? "—"} />
              <DetailRow icon={Package} label={t("weight")} value={load.weight ? `${load.weight.toLocaleString()} lbs` : "—"} />
              <DetailRow icon={MapPin} label={t("deadhead")} value={load.deadheadMiles ? `${load.deadheadMiles} mi` : "—"} />
            </div>
            {load.notes && (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">{load.notes}</p>
            )}
          </div>

          {/* Stops (multi-stop routes) */}
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><MapPin size={16} /> {t("stops")}</h3>
              {can.editLoad(role) && (
                <button onClick={() => setStopOpen((v) => !v)} className="rounded p-1 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10"><Plus size={16} /></button>
              )}
            </div>
            {stopOpen && (
              <form onSubmit={addStop} className="mb-3 space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <div className="flex gap-2">
                  <select className="input !py-1.5 text-sm" value={stopType} onChange={(e) => setStopType(e.target.value)}>
                    {STOP_TYPES.map((s) => <option key={s} value={s}>{s === "PICKUP" ? t("pickup") : t("dropoff")}</option>)}
                  </select>
                  <input type="date" className="input !py-1.5 text-sm" value={stopDate} onChange={(e) => setStopDate(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <input className="input !py-1.5 text-sm" placeholder={t("location")} value={stopLoc} onChange={(e) => setStopLoc(e.target.value)} />
                  <button type="submit" className="btn-primary !py-1.5"><Plus size={15} /></button>
                </div>
              </form>
            )}
            {(load.stops ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">{t("noData")}</p>
            ) : (
              <div className="space-y-2">
                {load.stops.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                    {s.completedAt
                      ? <Check size={15} className="shrink-0 text-emerald-500" />
                      : <CircleDot size={15} className="shrink-0 text-slate-300" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${s.type === "PICKUP" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"}`}>{s.type === "PICKUP" ? t("pickup") : t("dropoff")}</span>
                        <span className="truncate text-sm text-slate-700 dark:text-slate-200">{s.location}</span>
                      </div>
                      {s.scheduledAt && <span className="text-xs text-slate-400">{fmtDate(s.scheduledAt)}</span>}
                    </div>
                    {canUpdate && !s.completedAt && (
                      <button onClick={() => completeStop(s.id)} className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" title={t("markCompleted")}><Check size={14} /></button>
                    )}
                    {can.editLoad(role) && (
                      <button onClick={() => removeStop(s.id)} className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><FileText size={16} /> {t("documents")}</h3>
            <DocumentsPanel owner={{ loadId: id }} canManage={can.manageDocuments(role)} compact />
          </div>

          {/* Check calls / updates */}
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><Clock size={16} /> {t("updates")}</h3>
            {canUpdate && (
              <form onSubmit={addUpdate} className="mb-4 space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <div className="flex gap-2">
                  <select className="input !py-1.5 text-sm" value={ccStatus} onChange={(e) => setCcStatus(e.target.value)}>
                    {LOAD_STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
                  </select>
                  <input className="input !py-1.5 text-sm" placeholder={t("location")} value={ccLocation} onChange={(e) => setCcLocation(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <input className="input !py-1.5 text-sm" placeholder={t("notes")} value={ccNote} onChange={(e) => setCcNote(e.target.value)} />
                  <button type="submit" className="btn-primary !py-1.5" disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}</button>
                </div>
              </form>
            )}
            <div className="space-y-3">
              {(load.updates ?? []).length === 0 && <p className="text-sm text-slate-400">{t("noData")}</p>}
              {(load.updates ?? []).map((u: any, i: number) => (
                <div key={u.id} className="relative flex gap-3 pl-1">
                  <div className="flex flex-col items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-brand-500" />
                    {i < load.updates.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2">
                      {u.status && <span className={`badge ${LOAD_STATUS_COLORS[u.status]}`}>{t(u.status)}</span>}
                      {u.location && <span className="text-xs text-slate-500">📍 {u.location}</span>}
                    </div>
                    {u.note && <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{u.note}</p>}
                    <p className="mt-0.5 text-xs text-slate-400">{u.authorName} · {fmtDateTime(u.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-400"><Icon size={14} /> {label}</span>
      <span className="font-medium text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function PnlRow({ label, value, sign, strong }: any) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className={strong ? "font-semibold text-slate-900 dark:text-white" : "text-slate-500"}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-bold" : ""} ${sign === "-" ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
        {sign === "-" ? "−" : "+"}{money2(Math.abs(value))}
      </span>
    </div>
  );
}
