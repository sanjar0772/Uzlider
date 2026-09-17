"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Upload, Trash2, Download, Loader2, Paperclip } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { DOC_CATEGORIES, DOC_CATEGORY_COLORS } from "@/lib/constants";
import { fmtDate } from "@/lib/format";

type Owner = { loadId?: string; driverId?: string; truckId?: string; customerId?: string };

function fmtSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentsPanel({
  owner,
  canManage,
  compact = false,
}: {
  owner: Owner;
  canManage: boolean;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<string>("OTHER");
  const fileRef = useRef<HTMLInputElement>(null);

  const query =
    owner.loadId ? `loadId=${owner.loadId}` :
    owner.driverId ? `driverId=${owner.driverId}` :
    owner.truckId ? `truckId=${owner.truckId}` :
    owner.customerId ? `customerId=${owner.customerId}` : "";

  const load = useCallback(async () => {
    if (!query) return;
    const res = await fetch(`/api/documents?${query}`).then((r) => r.json());
    setDocs(res.documents ?? []);
    setLoading(false);
  }, [query]);

  useEffect(() => { load(); }, [load]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      toast.error(t("fileTooLarge"));
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...owner,
          name: file.name,
          category,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          dataUrl,
        }),
      });
      if (res.ok) {
        toast.success(t("uploadedOk"));
        load();
      } else {
        const d = await res.json();
        toast.error(d.error ?? t("somethingWrong"));
      }
    } catch {
      toast.error(t("somethingWrong"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function download(doc: any) {
    const res = await fetch(`/api/documents/${doc.id}`).then((r) => r.json());
    if (!res.document?.dataUrl) return toast.error(t("somethingWrong"));
    const a = document.createElement("a");
    a.href = res.document.dataUrl;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function remove(doc: any) {
    const ok = await confirm({ message: t("confirmDelete"), danger: true, confirmText: t("delete") });
    if (!ok) return;
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    toast.success(t("deletedOk"));
    load();
  }

  return (
    <div>
      {canManage && (
        <div className="mb-3 flex items-center gap-2">
          <select
            className="input !w-auto !py-1.5 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{t(`doc_${c}`)}</option>)}
          </select>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn-secondary !py-1.5 text-sm"
            disabled={uploading}
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {t("uploadDocument")}
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={onPick} />
        </div>
      )}

      {loading ? (
        <div className="skeleton h-16" />
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-6 text-center text-sm text-slate-400">
          <Paperclip size={20} />
          {t("noDocuments")}
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
            >
              <FileText size={16} className="shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{d.name}</div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className={`badge ${DOC_CATEGORY_COLORS[d.category] ?? ""}`}>{t(`doc_${d.category}`)}</span>
                  {fmtSize(d.size)} · {fmtDate(d.createdAt)}
                  {!compact && d.uploadedByName && ` · ${d.uploadedByName}`}
                </div>
              </div>
              <button onClick={() => download(d)} className="rounded p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10" title={t("download")}>
                <Download size={14} />
              </button>
              {canManage && (
                <button onClick={() => remove(d)} className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
