import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

// ---------------------------------------------------------------------------
// Telegram webhook — inbound updates from the bot.
//
// Register once (replace <TOKEN>, <DOMAIN>, pick a strong secret and also set
// it as TELEGRAM_WEBHOOK_SECRET in the environment):
//
//   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<DOMAIN>/api/telegram/webhook&secret_token=<SECRET>"
//
// Supported commands:
//   /start, /help  – usage
//   /id            – show this chat's id (use it as the dispatch chat id)
//   /link CODE     – connect your Telegram to your TMS account (code from Profile)
//   /status REF    – status of a load by ref number
//   /mine          – your active loads (linked drivers)
// ---------------------------------------------------------------------------

function reply(token: string, chatId: number | string, text: string) {
  // Fire-and-forget: Telegram only needs a 200 from us.
  sendTelegramMessage(token, chatId, text).catch(() => {});
}

const STATUS_EMOJI: Record<string, string> = {
  NEW: "🆕",
  ASSIGNED: "📋",
  IN_TRANSIT: "🚚",
  DELIVERED: "✅",
  CANCELLED: "❌",
};

function esc(v: unknown) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: Request) {
  // Verify the secret token if one is configured (strongly recommended).
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== expected)
      return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const settings = await prisma.companySettings.findFirst();
  const token = settings?.telegramBotToken;
  // Always ack so Telegram doesn't retry, even if we can't act on it.
  if (!token || !settings?.telegramEnabled) return NextResponse.json({ ok: true });

  let update: any;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = update?.message ?? update?.edited_message;
  const chatId = msg?.chat?.id;
  const text: string = (msg?.text ?? "").trim();
  if (!chatId || !text) return NextResponse.json({ ok: true });

  const [rawCmd, ...args] = text.split(/\s+/);
  const cmd = rawCmd.toLowerCase().replace(/@.*$/, ""); // strip @botname suffix
  const arg = args.join(" ").trim();

  try {
    if (cmd === "/start" || cmd === "/help") {
      reply(
        token,
        chatId,
        `👋 <b>${esc(settings.companyName || "TMS")} bot</b>\n\n` +
          `/link CODE — connect your account (get the code in Profile)\n` +
          `/status REF — load status by ref #\n` +
          `/mine — your active loads\n` +
          `/id — show this chat id`
      );
    } else if (cmd === "/id") {
      reply(token, chatId, `Chat id: <code>${esc(chatId)}</code>`);
    } else if (cmd === "/link") {
      const code = arg.toUpperCase();
      if (!code) {
        reply(token, chatId, "Usage: /link CODE (generate the code in your Profile).");
      } else {
        const user = await prisma.user.findFirst({ where: { telegramLinkCode: code } });
        if (!user) {
          reply(token, chatId, "❌ Invalid or expired code.");
        } else {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                telegramChatId: String(chatId),
                telegramUsername: msg?.from?.username ?? null,
                telegramLinkCode: null,
              },
            });
            reply(token, chatId, `✅ Connected as <b>${esc(user.name)}</b>.`);
          } catch (e: any) {
            // telegramChatId is unique — this Telegram is already linked elsewhere.
            reply(
              token,
              chatId,
              e?.code === "P2002"
                ? "❌ This Telegram is already linked to another account."
                : "❌ Could not connect. Try again."
            );
          }
        }
      }
    } else if (cmd === "/status") {
      const user = await prisma.user.findFirst({
        where: { telegramChatId: String(chatId) },
      });
      if (!user) {
        reply(token, chatId, "🔒 Link your account first: /link CODE");
      } else if (!arg) {
        reply(token, chatId, "Usage: /status REF");
      } else {
        const load = await prisma.load.findFirst({
          where: { refNumber: { equals: arg, mode: "insensitive" } },
          include: { driver: true },
        });
        if (!load) {
          reply(token, chatId, `❌ Load ${esc(arg)} not found.`);
        } else if (user.role === "DRIVER" && load.driverId !== user.driverId) {
          reply(token, chatId, "🔒 That load isn't assigned to you.");
        } else {
          const e = STATUS_EMOJI[load.status] ?? "🔄";
          reply(
            token,
            chatId,
            `${e} <b>${esc(load.refNumber)}</b> — ${esc(load.status)}\n` +
              `${esc(load.origin)} → ${esc(load.destination)}` +
              (load.driver ? `\n👤 ${esc(load.driver.name)}` : "")
          );
        }
      }
    } else if (cmd === "/mine") {
      const user = await prisma.user.findFirst({
        where: { telegramChatId: String(chatId) },
      });
      if (!user) {
        reply(token, chatId, "🔒 Link your account first: /link CODE");
      } else {
        const where: any = { status: { in: ["NEW", "ASSIGNED", "IN_TRANSIT"] } };
        if (user.role === "DRIVER") where.driverId = user.driverId ?? "__none__";
        const loads = await prisma.load.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 10,
        });
        if (loads.length === 0) {
          reply(token, chatId, "No active loads.");
        } else {
          const lines = loads
            .map(
              (l) =>
                `${STATUS_EMOJI[l.status] ?? "🔄"} <b>${esc(l.refNumber)}</b> — ${esc(
                  l.origin
                )} → ${esc(l.destination)}`
            )
            .join("\n");
          reply(token, chatId, `<b>Active loads</b>\n${lines}`);
        }
      }
    } else {
      reply(token, chatId, "Unknown command. Send /help.");
    }
  } catch {
    // Never let a handler error turn into a Telegram retry storm.
  }

  return NextResponse.json({ ok: true });
}
