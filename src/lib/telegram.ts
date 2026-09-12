import { prisma } from "@/lib/prisma";

// Telegram Bot integration. Configuration lives in CompanySettings so it can be
// managed from the Settings page without redeploying:
//   telegramEnabled / telegramBotToken / telegramChatId  – connection
//   notifyNewLoad / notifyStatus / notifyInvoicePaid / notifyCompliance – events
//
// Every helper is fire-and-forget and never throws: a failed Telegram call must
// never break the main API request.

type TelegramConfig = {
  enabled: boolean;
  token: string | null;
  chatId: string | null;
  notifyNewLoad: boolean;
  notifyStatus: boolean;
  notifyInvoicePaid: boolean;
  notifyCompliance: boolean;
};

export async function getTelegramConfig(): Promise<TelegramConfig> {
  const s = await prisma.companySettings.findFirst({
    select: {
      telegramEnabled: true,
      telegramBotToken: true,
      telegramChatId: true,
      notifyNewLoad: true,
      notifyStatus: true,
      notifyInvoicePaid: true,
      notifyCompliance: true,
    },
  });
  return {
    enabled: Boolean(s?.telegramEnabled),
    token: s?.telegramBotToken ?? null,
    chatId: s?.telegramChatId ?? null,
    notifyNewLoad: s?.notifyNewLoad ?? true,
    notifyStatus: s?.notifyStatus ?? true,
    notifyInvoicePaid: s?.notifyInvoicePaid ?? true,
    notifyCompliance: s?.notifyCompliance ?? true,
  };
}

// Low-level send to a specific chat. Returns { ok, error? }. Never throws.
export async function sendTelegramRaw(
  token: string,
  chatId: string | number,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok)
      return { ok: false, error: data.description || `HTTP ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

// Alias used by the webhook to reply directly to a chat.
export const sendTelegramMessage = sendTelegramRaw;

// High-level broadcast to the configured dispatch chat. Sends only when the
// integration is enabled and configured. `void notifyTelegram(...)` is fine.
export async function notifyTelegram(text: string): Promise<void> {
  const cfg = await getTelegramConfig();
  if (!cfg.enabled || !cfg.token || !cfg.chatId) return;
  await sendTelegramRaw(cfg.token, cfg.chatId, text);
}

export function escapeHtml(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const STATUS_EMOJI: Record<string, string> = {
  NEW: "🆕",
  ASSIGNED: "📋",
  IN_TRANSIT: "🚚",
  DELIVERED: "✅",
  CANCELLED: "❌",
};

type LoadLike = {
  refNumber: string;
  origin: string;
  destination: string;
  rate?: number | null;
  status?: string | null;
};

// --- Event notifications (each gated by its own toggle) ---------------------

export async function notifyNewLoad(load: LoadLike, actor: string) {
  const cfg = await getTelegramConfig();
  if (!cfg.enabled || !cfg.notifyNewLoad || !cfg.token || !cfg.chatId) return;
  const rate = load.rate ? ` • $${Math.round(load.rate).toLocaleString("en-US")}` : "";
  await sendTelegramRaw(
    cfg.token,
    cfg.chatId,
    `🆕 <b>New load ${escapeHtml(load.refNumber)}</b>\n` +
      `${escapeHtml(load.origin)} → ${escapeHtml(load.destination)}${rate}\n` +
      `<i>by ${escapeHtml(actor)}</i>`
  );
}

export async function notifyLoadStatus(
  load: LoadLike,
  status: string,
  actor: string,
  note?: string | null
) {
  const cfg = await getTelegramConfig();
  if (!cfg.enabled || !cfg.notifyStatus || !cfg.token || !cfg.chatId) return;
  const emoji = STATUS_EMOJI[status] ?? "🔄";
  const extra = note ? `\n📍 ${escapeHtml(note)}` : "";
  await sendTelegramRaw(
    cfg.token,
    cfg.chatId,
    `${emoji} <b>${escapeHtml(load.refNumber)}</b> → <b>${escapeHtml(status)}</b>\n` +
      `${escapeHtml(load.origin)} → ${escapeHtml(load.destination)}${extra}\n` +
      `<i>by ${escapeHtml(actor)}</i>`
  );
}

export async function notifyInvoicePaid(
  invoice: { number: string; amount: number },
  actor: string
) {
  const cfg = await getTelegramConfig();
  if (!cfg.enabled || !cfg.notifyInvoicePaid || !cfg.token || !cfg.chatId) return;
  await sendTelegramRaw(
    cfg.token,
    cfg.chatId,
    `💰 <b>Invoice ${escapeHtml(invoice.number)} PAID</b>\n` +
      `$${Math.round(invoice.amount).toLocaleString("en-US")}\n` +
      `<i>by ${escapeHtml(actor)}</i>`
  );
}

export async function notifyCompliance(lines: string[]) {
  const cfg = await getTelegramConfig();
  if (!cfg.enabled || !cfg.notifyCompliance || !cfg.token || !cfg.chatId || lines.length === 0)
    return;
  await sendTelegramRaw(
    cfg.token,
    cfg.chatId,
    `⚠️ <b>Compliance alert</b>\n` + lines.map((l) => `• ${escapeHtml(l)}`).join("\n")
  );
}
