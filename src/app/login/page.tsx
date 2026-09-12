"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Loader2, MapPin, ShieldCheck, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";

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

  const features = [
    { icon: MapPin, key: "featLiveGps" },
    { icon: Send, key: "featTelegram" },
    { icon: ShieldCheck, key: "featCompliance" },
  ];

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand / marketing panel */}
      <div className="relative hidden overflow-hidden bg-brand-mesh bg-brand-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="relative">
          <Logo size={44} subtitle={null} className="text-white [&_*]:!text-white" />
        </div>
        <div className="relative space-y-6">
          <h2 className="max-w-md text-3xl font-extrabold leading-tight text-white">
            {t("loginHeroTitle")}
          </h2>
          <p className="max-w-md text-brand-100/80">{t("loginHeroSubtitle")}</p>
          <div className="space-y-3 pt-2">
            {features.map((f) => (
              <div key={f.key} className="flex items-center gap-3 text-brand-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
                  <f.icon size={18} />
                </span>
                <span className="text-sm font-medium">{t(f.key)}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/50">
          © {new Date().getFullYear()} Uzlider TMS
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <div className="lg:hidden">
              <Logo size={38} />
            </div>
            <div className="ml-auto">
              <LanguageSwitcher />
            </div>
          </div>

          <div className="card p-8 shadow-pop">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t("loginTitle")}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("tagline")}
              </p>
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
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="btn-primary w-full py-2.5"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <LogIn size={18} />
                )}
                {t("signIn")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
