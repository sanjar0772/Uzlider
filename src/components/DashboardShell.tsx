"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { can, ROLE_COLORS } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const nav = [
    { href: "/dashboard", label: t("dashboard"), icon: "📊", show: true },
    { href: "/dashboard/loads", label: t("loads"), icon: "📦", show: true },
    {
      href: "/dashboard/drivers",
      label: t("drivers"),
      icon: "🚚",
      show: user.role !== "DRIVER",
    },
    {
      href: "/dashboard/users",
      label: t("users"),
      icon: "👥",
      show: can.manageUsers(user.role),
    },
  ].filter((n) => n.show);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const NavLinks = () => (
    <nav className="space-y-1">
      {nav.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-brand-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg p-1.5 hover:bg-slate-100 md:hidden"
            onClick={() => setOpen(!open)}
          >
            ☰
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🚚</span>
            <span className="font-bold">{t("appName")}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium leading-tight">{user.name}</div>
            <span className={`badge ${ROLE_COLORS[user.role]}`}>
              {t(user.role)}
            </span>
          </div>
          <button onClick={logout} className="btn-secondary !px-3 !py-1.5 text-xs">
            {t("signOut")}
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
          <NavLinks />
        </aside>

        {/* Sidebar (mobile) */}
        {open && (
          <div className="fixed inset-0 z-20 md:hidden">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-60 bg-white p-4 pt-16">
              <NavLinks />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="min-h-[calc(100vh-57px)] flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
