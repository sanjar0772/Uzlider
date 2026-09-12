"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, Save, Send, Bell } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { PageHeader, Skeleton } from "@/components/ui";

export default function SettingsPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => setForm(d.settings));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: any = { ...form };
    delete payload.telegramBotTokenSet;
    if (token.trim()) payload.telegramBotToken = token.trim();
    const res = await fetch("/api/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      setForm(d.settings);
      setToken("");
      toast.success(t("updatedOk"));
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || t("somethingWrong"));
    }
  }

  async function sendTest() {
    setTesting(true);
    const res = await fetch("/api/telegram/test", { method: "POST" });
    setTesting(false);
    if (res.ok) toast.success(t("testSent"));
    else {
      const d = await res.json().catch(() => ({}));
      toast.error(`${t("testFailed")}: ${d.error || ""}`.trim());
    }
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

  const toggle = (key: string, label: string) => (
    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        checked={!!form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
      />
      {label}
    </label>
  );

  return (
    <form onSubmit={save} className="space-y-4">
      <PageHeader title={t("companySettings")} subtitle={t("costAssumptions")} />

      {/* Cost assumptions */}
      <div className="card max-w-2xl space-y-5 p-6">
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
      </div>

      {/* Telegram integration */}
      <div className="card max-w-2xl space-y-5 p-6">
        <div className="flex items-center gap-2 text-slate-500">
          <Send size={18} />
          <span className="text-sm font-medium">{t("telegramIntegration")}</span>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={!!form.telegramEnabled}
            onChange={(e) => setForm({ ...form, telegramEnabled: e.target.checked })}
          />
          {t("enableTelegram")}
        </label>

        <div>
          <label className="label">
            {t("botToken")}{" "}
            {form.telegramBotTokenSet && (
              <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                {t("configured")}
              </span>
            )}
          </label>
          <input
            className="input font-mono"
            type="password"
            autoComplete="off"
            placeholder={form.telegramBotTokenSet ? "••••••••  " + t("replaceToken") : "123456:ABC-DEF..."}
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>

        <div>
          <label className="label">{t("dispatchChatId")}</label>
          <input
            className="input font-mono"
            placeholder="-1001234567890"
            value={form.telegramChatId ?? ""}
            onChange={(e) => setForm({ ...form, telegramChatId: e.target.value })}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <Bell size={15} /> {t("notifications")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {toggle("notifyNewLoad", t("notifyNewLoad"))}
            {toggle("notifyStatus", t("notifyStatus"))}
            {toggle("notifyInvoicePaid", t("notifyInvoicePaid"))}
            {toggle("notifyCompliance", t("notifyCompliance"))}
          </div>
        </div>

        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/50">
          {t("telegramHint")}
        </p>

        <div>
          <button
            type="button"
            onClick={sendTest}
            disabled={testing || !form.telegramBotTokenSet || !form.telegramChatId}
            className="btn-secondary"
          >
            <Send size={15} /> {t("sendTest")}
          </button>
        </div>
      </div>

      <div className="flex max-w-2xl justify-end">
        <button type="submit" className="btn-primary" disabled={saving}>
          <Save size={16} /> {t("saveSettings")}
        </button>
      </div>
    </form>
  );
}
