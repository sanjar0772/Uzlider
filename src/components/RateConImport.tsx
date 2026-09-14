"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Upload, Loader2, FileWarning, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { EQUIPMENT_TYPES, LOAD_STATUSES } from "@/lib/constants";
import Modal from "@/components/Modal";

type Driver = { id: string; name: string };
type Customer = { id: string; name: string };

const emptyForm = {
  refNumber: "", broker: "", customerId: "", origin: "", destination: "",
  pickupDate: "", deliveryDate: "", rate: "", driverPay: "", miles: "", weight: "",
  commodity: "", equipment: "VAN", detention: "", lumperFee: "", driverId: "",
  status: "NEW", notes: "",
};

type OriginalFile = { name: string; mimeType: string; size: number; dataUrl: string };

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function RateConImport({
  drivers,
  onCreated,
}: {
  drivers: Driver[];
  onCreated: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [original, setOriginal] = useState<OriginalFile | null>(null);
  const [meta, setMeta] = useState<{
    confidence: string | null;
    documentType: string | null;
    duplicate: { refNumber: string; reason: string } | null;
    profit: { rpm: number; targetRpm: number; belowTarget: boolean } | null;
    missing: string[];
  }>({ confidence: null, documentType: null, duplicate: null, profit: null, missing: [] });

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []))
      .catch(() => {});
  }, []);

  const process = useCallback(
    async (file: File) => {
      if (!/^(image\/|application\/pdf)/.test(file.type)) {
        toast.error(t("aiUnsupportedFile"));
        return;
      }
      if (file.size > 6 * 1024 * 1024) {
        toast.error(t("fileTooLarge"));
        return;
      }
      setBusy(true);
      try {
        const dataUrl = await fileToDataUrl(file);
        const orig: OriginalFile = {
          name: file.name, mimeType: file.type, size: file.size, dataUrl,
        };
        setOriginal(orig);
        const res = await fetch("/api/loads/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl, mimeType: file.type }),
        });
        const d = await res.json();
        if (!res.ok) {
          toast.error(
            d.error === "AI_NOT_CONFIGURED" ? t("aiNotConfigured") : t("aiExtractFailed")
          );
          return;
        }
        const x = d.draft;
        const missing = ["refNumber", "origin", "destination", "rate"].filter((k) => !x[k]);
        setForm({
          refNumber: x.refNumber ?? "",
          broker: x.broker ?? "",
          customerId: d.customerMatch?.id ?? "",
          origin: x.origin ?? "",
          destination: x.destination ?? "",
          pickupDate: x.pickupDate ?? "",
          deliveryDate: x.deliveryDate ?? "",
          rate: x.rate != null ? String(x.rate) : "",
          driverPay: "",
          miles: x.miles != null ? String(x.miles) : "",
          weight: x.weight != null ? String(x.weight) : "",
          commodity: x.commodity ?? "",
          equipment: x.equipment ?? "VAN",
          detention: x.detention != null ? String(x.detention) : "",
          lumperFee: x.lumperFee != null ? String(x.lumperFee) : "",
          driverId: "",
          status: "NEW",
          notes: x.notes ?? "",
        });
        setMeta({
          confidence: x.confidence,
          documentType: x.documentType,
          duplicate: d.duplicate,
          profit: d.profit,
          missing,
        });
        setReviewOpen(true);
      } catch {
        toast.error(t("aiExtractFailed"));
      } finally {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [t, toast]
  );

  // Whole-page drag & drop: drop a rate con anywhere to import it.
  useEffect(() => {
    let depth = 0;
    const hasFile = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFile(e)) return;
      depth++;
      setDragging(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFile(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onOver = (e: DragEvent) => {
      if (hasFile(e)) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      depth = 0;
      setDragging(false);
      if (!hasFile(e)) return;
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file && !busy) process(file);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [busy, process]);

  async function confirmCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.refNumber || !form.origin || !form.destination) {
      toast.error(t("aiFillRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          // If a customer was matched/selected, prefer it; otherwise keep broker text.
          broker: form.customerId ? null : form.broker || null,
          aiGenerated: true,
          needsReview: false,
          source: "board-import",
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error ?? t("somethingWrong"));
        setSaving(false);
        return;
      }
      // Attach the original document to the new load (best-effort).
      if (original && d.load?.id) {
        fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loadId: d.load.id,
            name: original.name,
            category: "RATE_CON",
            mimeType: original.mimeType,
            size: original.size,
            dataUrl: original.dataUrl,
          }),
        }).catch(() => {});
      }
      toast.success(t("createdOk"));
      setReviewOpen(false);
      setOriginal(null);
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  const conf = meta.confidence;
  const confBadge =
    conf === "high"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
      : conf === "medium"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
      : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";

  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="btn-primary"
        disabled={busy}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {busy ? t("aiReading") : t("importRateCon")}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) process(f);
        }}
      />

      {/* Full-page drop overlay */}
      {(dragging || busy) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-600/20 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand-400 bg-white/95 px-10 py-8 text-center shadow-2xl dark:bg-slate-900/95">
            {busy ? (
              <>
                <Loader2 size={40} className="animate-spin text-brand-600" />
                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t("aiReading")}
                </div>
              </>
            ) : (
              <>
                <Upload size={40} className="text-brand-600" />
                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t("dropRateCon")}
                </div>
                <div className="text-sm text-slate-500">{t("dropRateConHint")}</div>
              </>
            )}
          </div>
        </div>
      )}

      {reviewOpen && (
        <Modal
          title={t("reviewExtracted")}
          onClose={() => !saving && setReviewOpen(false)}
          wide
        >
          <form onSubmit={confirmCreate} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm dark:bg-brand-500/10">
              <Sparkles size={15} className="text-brand-600" />
              <span className="text-slate-600 dark:text-slate-300">{t("aiExtractedHint")}</span>
              {conf && <span className={`badge ${confBadge}`}>{t("confidence")}: {t(`conf_${conf}`)}</span>}
            </div>

            {/* Warnings */}
            {meta.duplicate && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                <FileWarning size={16} className="mt-0.5 shrink-0" />
                <span>
                  {meta.duplicate.reason === "ref" ? t("dupWarnRef") : t("dupWarnLane")}: {meta.duplicate.refNumber}
                </span>
              </div>
            )}
            {meta.profit?.belowTarget && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  {t("lowRpmWarn")}: ${meta.profit.rpm.toFixed(2)}/mi ({t("target")} ${meta.profit.targetRpm.toFixed(2)})
                </span>
              </div>
            )}
            {meta.missing.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{t("missingFieldsWarn")}: {meta.missing.map((m) => t(m)).join(", ")}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={`${t("refNumber")} *`} flag={meta.missing.includes("refNumber")}>
                <input className="input" value={form.refNumber} onChange={(e) => setForm({ ...form, refNumber: e.target.value })} required />
              </Field>
              <Field label={t("customer")}>
                <select className="input" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                  <option value="">{form.broker ? `${form.broker} (${t("newCustomer")})` : "—"}</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label={`${t("origin")} *`} flag={meta.missing.includes("origin")}>
                <input className="input" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} required />
              </Field>
              <Field label={`${t("destination")} *`} flag={meta.missing.includes("destination")}>
                <input className="input" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required />
              </Field>
              <Field label={t("pickupDate")}>
                <input type="date" className="input" value={form.pickupDate} onChange={(e) => setForm({ ...form, pickupDate: e.target.value })} />
              </Field>
              <Field label={t("deliveryDate")}>
                <input type="date" className="input" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
              </Field>
              <Field label={`${t("rate")} ($)`} flag={meta.missing.includes("rate")}>
                <input type="number" step="0.01" className="input" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
              </Field>
              <Field label={t("miles")}>
                <input type="number" className="input" value={form.miles} onChange={(e) => setForm({ ...form, miles: e.target.value })} />
              </Field>
              <Field label={t("weight")}>
                <input type="number" className="input" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              </Field>
              <Field label={t("commodity")}>
                <input className="input" value={form.commodity} onChange={(e) => setForm({ ...form, commodity: e.target.value })} />
              </Field>
              <Field label={`${t("detention")} ($)`}>
                <input type="number" step="0.01" className="input" value={form.detention} onChange={(e) => setForm({ ...form, detention: e.target.value })} />
              </Field>
              <Field label={`${t("lumper")} ($)`}>
                <input type="number" step="0.01" className="input" value={form.lumperFee} onChange={(e) => setForm({ ...form, lumperFee: e.target.value })} />
              </Field>
              <Field label={t("equipment")}>
                <select className="input" value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })}>
                  {EQUIPMENT_TYPES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
                </select>
              </Field>
              <Field label={t("driver")}>
                <select className="input" value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
                  <option value="">{t("unassigned")}</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label={t("status")}>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {LOAD_STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
                </select>
              </Field>
            </div>
            <Field label={t("notes")}>
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>

            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setReviewOpen(false)} className="btn-secondary" disabled={saving}>
                {t("cancel")}
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {t("createLoadBtn")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Field({
  label,
  children,
  flag,
}: {
  label: string;
  children: React.ReactNode;
  flag?: boolean;
}) {
  return (
    <div>
      <label className={`label ${flag ? "!text-amber-600 dark:!text-amber-400" : ""}`}>{label}</label>
      {children}
    </div>
  );
}
