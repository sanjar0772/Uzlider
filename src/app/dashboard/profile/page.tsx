"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, Lock, Palette, Sun, Moon } from "lucide-react";
import { useI18n, LANG_LABELS, Lang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/components/Toast";
import { ROLE_COLORS } from "@/lib/constants";
import { PageHeader } from "@/components/ui";

export default function ProfilePage() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cur, setCur] = useState("");
  const [np, setNp] = useState("");
  const [cp, setCp] = useState("");
  const [pwErr, setPwErr] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      setMe(d.user);
      setName(d.user?.name ?? "");
    });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone }),
    });
    if (res.ok) { toast.success(t("updatedOk")); router.refresh(); }
    else toast.error(t("somethingWrong"));
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    setPwErr("");
    if (np !== cp) { setPwErr(t("passwordMismatch")); return; }
    const res = await fetch("/api/profile", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: cur, newPassword: np }),
    });
    if (res.ok) { toast.success(t("passwordChanged")); setCur(""); setNp(""); setCp(""); }
    else {
      const d = await res.json();
      setPwErr(d.error === "WRONG_PASSWORD" ? t("wrongPassword") : t("somethingWrong"));
    }
  }

  if (!me) return null;

  return (
    <div className="space-y-6">
      <PageHeader title={t("myProfile")} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile card */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              {me.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">{me.name}</div>
              <div className="text-sm text-slate-500">{me.email}</div>
              <span className={`badge mt-1 ${ROLE_COLORS[me.role]}`}>{t(me.role)}</span>
            </div>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div><label className="label">{t("name")}</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="label">{t("phone")}</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("optional")} /></div>
            <button type="submit" className="btn-primary"><UserCircle size={16} /> {t("save")}</button>
          </form>
        </div>

        {/* Password */}
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><Lock size={18} /> {t("changePassword")}</h2>
          <form onSubmit={changePw} className="space-y-4">
            <div><label className="label">{t("currentPassword")}</label><input type="password" className="input" value={cur} onChange={(e) => setCur(e.target.value)} required /></div>
            <div><label className="label">{t("newPassword")}</label><input type="password" className="input" value={np} onChange={(e) => setNp(e.target.value)} required /></div>
            <div><label className="label">{t("confirmPassword")}</label><input type="password" className="input" value={cp} onChange={(e) => setCp(e.target.value)} required /></div>
            {pwErr && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{pwErr}</p>}
            <button type="submit" className="btn-primary"><Lock size={16} /> {t("changePassword")}</button>
          </form>
        </div>

        {/* Preferences */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><Palette size={18} /> {t("theme")} & {t("language")}</h2>
          <div className="flex flex-wrap gap-8">
            <div>
              <div className="label">{t("theme")}</div>
              <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
                <button onClick={() => setTheme("light")} className={`flex items-center gap-1.5 px-4 py-2 text-sm ${theme === "light" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300"}`}><Sun size={15} /> {t("light")}</button>
                <button onClick={() => setTheme("dark")} className={`flex items-center gap-1.5 px-4 py-2 text-sm ${theme === "dark" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300"}`}><Moon size={15} /> {t("dark")}</button>
              </div>
            </div>
            <div>
              <div className="label">{t("language")}</div>
              <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
                {(["en", "ru", "uz"] as Lang[]).map((l) => (
                  <button key={l} onClick={() => setLang(l)} className={`px-4 py-2 text-sm ${lang === l ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300"}`}>{LANG_LABELS[l]}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
