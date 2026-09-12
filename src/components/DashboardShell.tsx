"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Columns3,
  Package,
  Users,
  Truck,
  Building2,
  FileText,
  BarChart3,
  UserCog,
  History,
  UserCircle,
  LogOut,
  Menu,
  Moon,
  Sun,
  ShieldCheck,
  SlidersHorizontal,
  Radio,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { can, ROLE_COLORS } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CommandPalette from "@/components/CommandPalette";
import Notifications from "@/components/Notifications";
import Logo from "@/components/Logo";
import DriverLocationTracker from "@/components/DriverLocationTracker";
import { Search } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  show: boolean;
  group: string;
};

export default function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const staff = user.role !== "DRIVER";

  const nav: NavItem[] = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard, show: true, group: "operations" },
    { href: "/dashboard/board", label: t("dispatchBoard"), icon: Columns3, show: staff, group: "operations" },
    { href: "/dashboard/tracking", label: t("liveTracking"), icon: Radio, show: staff, group: "operations" },
    { href: "/dashboard/loads", label: t("loads"), icon: Package, show: true, group: "operations" },
    { href: "/dashboard/drivers", label: t("drivers"), icon: Users, show: staff, group: "fleet" },
    { href: "/dashboard/trucks", label: t("trucks"), icon: Truck, show: staff, group: "fleet" },
    { href: "/dashboard/compliance", label: t("compliance"), icon: ShieldCheck, show: staff, group: "fleet" },
    { href: "/dashboard/customers", label: t("customers"), icon: Building2, show: staff, group: "finance" },
    { href: "/dashboard/invoices", label: t("invoices"), icon: FileText, show: can.viewInvoices(user.role), group: "finance" },
    { href: "/dashboard/reports", label: t("reports"), icon: BarChart3, show: can.viewReports(user.role), group: "finance" },
    { href: "/dashboard/users", label: t("users"), icon: UserCog, show: can.manageUsers(user.role), group: "admin" },
    { href: "/dashboard/settings", label: t("settings"), icon: SlidersHorizontal, show: can.manageUsers(user.role), group: "admin" },
    { href: "/dashboard/activity", label: t("activity"), icon: History, show: can.viewActivity(user.role), group: "admin" },
    { href: "/dashboard/profile", label: t("profile"), icon: UserCircle, show: true, group: "admin" },
  ].filter((n) => n.show);

  const groups = ["operations", "fleet", "finance", "admin"];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center px-5 py-4">
        <Logo size={34} />
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {groups.map((g) => {
          const items = nav.filter((n) => n.group === g);
          if (items.length === 0) return null;
          return (
            <div key={g}>
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {t(g)}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-glow"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-900 dark:text-white">
              {user.name}
            </div>
            <span className={`badge ${ROLE_COLORS[user.role]}`}>
              {t(user.role)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white md:block dark:border-slate-800 dark:bg-slate-900">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-slate-900">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="md:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg p-2 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
            <button
              onClick={() => window.dispatchEvent(new Event("uzlider-cmdk"))}
              className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-50 sm:flex dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <Search size={15} /> {t("search")}
              <kbd className="rounded border border-slate-200 px-1 text-[10px] dark:border-slate-600">⌘K</kbd>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {staff && <Notifications />}
            <button
              onClick={toggle}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <LanguageSwitcher />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">{t("signOut")}</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
      </div>

      <CommandPalette staff={staff} />
      {user.role === "DRIVER" && user.driverId && (
        <DriverLocationTracker driverId={user.driverId} />
      )}
    </div>
  );
}
