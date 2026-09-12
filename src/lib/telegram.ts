import { prisma } from "@/lib/prisma";

// Minimal Telegram Bot API helper. Configuration lives in CompanySettings
// (telegramEnabled / telegramBotToken / telegramChatId) so it can be managed
// from the Settings page without redeploying.

type TelegramConfig = {
  enabled: boolean;
  token: string | null;
  chatId: string | null;
};

export async function getTelegramConfig(): Promise<TelegramConfig> {
  const s = await prisma.companySettings.findFirst({
    select: {
      telegramEnabled: true,
      telegramBotToken: true,
      telegramChatId: true,
    },
  });
  return {
    enabled: Boolean(s?.telegramEnabled),
    token: s?.telegramBotToken ?? null,
    chatId: s?.telegramChatId ?? null,
  };
}

// Low-level send. Returns { ok, error? }. Never throws.
export async function sendTelegramRaw(
  token: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.description || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

// High-level notify: sends only when integration is enabled and configured.
// Fire-and-forget friendly — callers can `void notifyTelegram(...)`.
export async function notifyTelegram(text: string): Promise<void> {
  const cfg = await getTelegramConfig();
  if (!cfg.enabled || !cfg.token || !cfg.chatId) return;
  await sendTelegramRaw(cfg.token, cfg.chatId, text);
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
