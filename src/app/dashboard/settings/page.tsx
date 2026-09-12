"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { PageHeader, Skeleton } from "@/components/ui";

export default function SettingsPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => setForm(d.settings));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) toast.success(t("updatedOk"));
    else toast.error(t("somethingWrong"));
  }

  if (!form)
    return (
      <div className="space-y-4">
        <PageHeader title={t("settings")} />
        <Skeleton className="h-64" />
      </div>
    );

  const field = (key: string, label: string, step?: string, prefix?: string) => (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{prefix}</span>}
        <input
          type="number" step={step ?? "0.01"}
          className={`input ${prefix ? "pl-7" : ""}`}
          value={form[key] ?? ""}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader title={t("companySettings")} subtitle={t("costAssumptions")} />
      <form onSubmit={save} className="card max-w-2xl space-y-5 p-6">
        <div className="flex items-center gap-2 text-slate-500">
          <SlidersHorizontal size={18} />
          <span className="text-sm">{t("costAssumptions")}</span>
        </div>
        <div>
          <label className="label">{t("companyName")}</label>
          <input className="input" value={form.companyName ?? ""} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("mpg", t("mpg"), "0.1")}
          {field("fuelPricePerGallon", t("fuelPrice"), "0.01", "$")}
          {field("fixedCostPerMile", t("fixedCostPerMile"), "0.01", "$")}
          {field("targetRpm", t("targetRpm"), "0.01", "$")}
          {field("factoringRatePct", t("factoringRate"), "0.1")}
        </div>
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/50">
          {t("loadEconomics")}: {t("netProfit")} = {t("grossRevenue")} − {t("driverPayTotal")} − {t("fuelCost")} − {t("fixedCost")}
        </p>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}><Save size={16} /> {t("saveSettings")}</button>
        </div>
      </form>
    </div>
  );
}
