"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, User, Building2, Truck as TruckIcon, CornerDownLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Item = { type: string; id: string; title: string; sub: string; href: string };

export default function CommandPalette({ staff }: { staff: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    if (loaded) return;
    const all: Item[] = [];
    const loads = await fetch("/api/loads").then((r) => r.json()).catch(() => ({ loads: [] }));
    for (const l of loads.loads ?? [])
      all.push({ type: "load", id: l.id, title: l.refNumber, sub: `${l.origin} → ${l.destination}`, href: `/dashboard/loads/${l.id}` });
    if (staff) {
      const [dr, cu, tr] = await Promise.all([
        fetch("/api/drivers").then((r) => r.json()).catch(() => ({ drivers: [] })),
        fetch("/api/customers").then((r) => r.json()).catch(() => ({ customers: [] })),
        fetch("/api/trucks").then((r) => r.json()).catch(() => ({ trucks: [] })),
      ]);
      for (const d of dr.drivers ?? [])
        all.push({ type: "driver", id: d.id, title: d.name, sub: d.phone ?? "", href: `/dashboard/drivers` });
      for (const c of cu.customers ?? [])
        all.push({ type: "customer", id: c.id, title: c.name, sub: c.contact ?? "", href: `/dashboard/customers` });
      for (const tk of tr.trucks ?? [])
        all.push({ type: "truck", id: tk.id, title: tk.unitNumber, sub: [tk.make, tk.model].filter(Boolean).join(" "), href: `/dashboard/trucks` });
    }
    setItems(all);
    setLoaded(true);
  }, [loaded, staff]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        loadData();
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => { setOpen(true); loadData(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("uzlider-cmdk", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("uzlider-cmdk", onOpen as EventListener);
    };
  }, [loadData]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQ(""); setActive(0); }
  }, [open]);

  const filtered = q.trim()
    ? items.filter((i) => (i.title + " " + i.sub).toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : items.slice(0, 6);

  function go(item: Item) {
    setOpen(false);
    router.push(item.href);
  }

  const ICONS: Record<string, any> = { load: Package, driver: User, customer: Building2, truck: TruckIcon };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 p-4 pt-24 animate-in" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800">
          <Search size={18} className="text-slate-400" />
          <input
            ref={inputRef} value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter" && filtered[active]) go(filtered[active]);
            }}
            placeholder={`${t("search")}...`}
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 dark:border-slate-700">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-400">{t("noData")}</p>}
          {filtered.map((item, i) => {
            const Icon = ICONS[item.type] ?? Package;
            return (
              <button
                key={item.type + item.id}
                onClick={() => go(item)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${i === active ? "bg-brand-50 dark:bg-brand-500/10" : ""}`}
              >
                <Icon size={16} className="text-slate-400" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.title}</div>
                  {item.sub && <div className="truncate text-xs text-slate-400">{item.sub}</div>}
                </div>
                <span className="text-[10px] uppercase text-slate-400">{t(item.type === "load" ? "loads" : item.type === "driver" ? "drivers" : item.type === "customer" ? "customers" : "trucks")}</span>
                {i === active && <CornerDownLeft size={14} className="text-slate-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
