import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Telegram Bot integration.
//
// Configuration lives in CompanySettings (editable from the Settings page):
//   telegramEnabled   – master on/off switch
//   telegramBotToken  – the bot token from @BotFather
//   telegramChatId    – dispatch group / channel id for broadcasts
//   notify*           – per-event toggles
//
// Every helper here is fire-and-forget and swallows its own errors: a failed
// Telegram call must never break the main API request. Call sites still wrap
// with .catch(() => {}) as a second line of defence.
// ---------------------------------------------------------------------------

export type TelegramConfig = {
  enabled: boolean;
  botToken: string | null;
  chatId: string | null;
  notifyNewLoad: boolean;
  notifyStatus: boolean;
  notifyInvoicePaid: boolean;
  notifyCompliance: boolean;
};

export async function getTelegramConfig(): Promise<TelegramConfig | null> {
  try {
    const s = await prisma.companySettings.findFirst();
    if (!s) return null;
    return {
      enabled: s.telegramEnabled,
      botToken: s.telegramBotToken,
      chatId: s.telegramChatId,
      notifyNewLoad: s.notifyNewLoad,
      notifyStatus: s.notifyStatus,
      notifyInvoicePaid: s.notifyInvoicePaid,
      notifyCompliance: s.notifyCompliance,
    };
  } catch {
    return null;
  }
}

const API = "https://api.telegram.org";

// Low-level call to the Telegram Bot API. Returns the parsed JSON body, or an
// object with ok:false when the call fails (never throws).
export async function tgApi(
  token: string,
  method: string,
  payload: Record<string, any>
): Promise<any> {
  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Never hang the request forever on a slow Telegram edge.
      signal: AbortSignal.timeout(8000),
    });
    return await res.json();
  } catch (e: any) {
    return { ok: false, description: e?.message ?? "network error" };
  }
}

// Send a message to a specific chat id using the given bot token.
export async function sendTelegramMessage(
  token: string,
  chatId: string | number,
  text: string
): Promise<any> {
  return tgApi(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

// Broadcast to the configured dispatch group. Respects the master switch and
// requires both a token and a chat id. Returns true when a message was sent.
export async function notifyDispatch(text: string): Promise<boolean> {
  const cfg = await getTelegramConfig();
  if (!cfg || !cfg.enabled || !cfg.botToken || !cfg.chatId) return false;
  const res = await sendTelegramMessage(cfg.botToken, cfg.chatId, text);
  return !!res?.ok;
}

// --- HTML escaping for user-supplied fields (parse_mode: HTML) --------------
function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

// --- Event notifications ----------------------------------------------------

export async function notifyNewLoad(load: LoadLike, actor: string) {
  const cfg = await getTelegramConfig();
  if (!cfg?.enabled || !cfg.notifyNewLoad) return;
  const rate = load.rate ? ` • $${Math.round(load.rate).toLocaleString("en-US")}` : "";
  await notifyDispatch(
    `🆕 <b>New load ${esc(load.refNumber)}</b>\n` +
      `${esc(load.origin)} → ${esc(load.destination)}${rate}\n` +
      `<i>by ${esc(actor)}</i>`
  );
}

export async function notifyLoadStatus(
  load: LoadLike,
  status: string,
  actor: string,
  note?: string | null
) {
  const cfg = await getTelegramConfig();
  if (!cfg?.enabled || !cfg.notifyStatus) return;
  const emoji = STATUS_EMOJI[status] ?? "🔄";
  const extra = note ? `\n📍 ${esc(note)}` : "";
  await notifyDispatch(
    `${emoji} <b>${esc(load.refNumber)}</b> → <b>${esc(status)}</b>\n` +
      `${esc(load.origin)} → ${esc(load.destination)}${extra}\n` +
      `<i>by ${esc(actor)}</i>`
  );
}

export async function notifyInvoicePaid(
  invoice: { number: string; amount: number },
  actor: string
) {
  const cfg = await getTelegramConfig();
  if (!cfg?.enabled || !cfg.notifyInvoicePaid) return;
  await notifyDispatch(
    `💰 <b>Invoice ${esc(invoice.number)} PAID</b>\n` +
      `$${Math.round(invoice.amount).toLocaleString("en-US")}\n` +
      `<i>by ${esc(actor)}</i>`
  );
}

export async function notifyCompliance(lines: string[]) {
  const cfg = await getTelegramConfig();
  if (!cfg?.enabled || !cfg.notifyCompliance || lines.length === 0) return;
  await notifyDispatch(
    `⚠️ <b>Compliance alert</b>\n` + lines.map((l) => `• ${esc(l)}`).join("\n")
  );
}
