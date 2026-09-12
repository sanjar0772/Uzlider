"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const DEMO = [
  { role: "OWNER", email: "owner@uzlider.com", pw: "owner123" },
  { role: "MANAGER", email: "manager@uzlider.com", pw: "manager123" },
  { role: "DISPATCHER", email: "dispatch@uzlider.com", pw: "dispatch123" },
  { role: "UPDATER", email: "updater@uzlider.com", pw: "updater123" },
  { role: "DRIVER", email: "driver@uzlider.com", pw: "driver123" },
];

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setError(t("loginError"));
    }
  }

  function fill(email: string, pw: string) {
    setEmail(email);
    setPassword(pw);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-600 to-brand-700 p-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600 text-2xl">
              🚚
            </div>
            <h1 className="text-2xl font-bold">{t("appName")}</h1>
            <p className="text-sm text-slate-500">{t("tagline")}</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">{t("email")}</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">{t("password")}</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? t("loading") : t("signIn")}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("demoAccounts")}
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  onClick={() => fill(d.email, d.pw)}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-left text-xs hover:bg-slate-50"
                >
                  <span className="font-medium">{t(d.role)}</span>
                  <span className="text-slate-400">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
