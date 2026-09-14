import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, getTelegramFileDataUrl } from "@/lib/telegram";
import { aiConfigured, extractLoadFromDocument } from "@/lib/ai";
import { matchCustomer, findDuplicate, profitCheck, fallbackRef } from "@/lib/loadExtract";
import { can } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

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
  if (!chatId) return NextResponse.json({ ok: true });

  // --- Photo / document intake: forward a rate con to auto-create a load ------
  const photo = Array.isArray(msg?.photo) && msg.photo.length ? msg.photo[msg.photo.length - 1] : null;
  const doc =
    msg?.document &&
    (String(msg.document.mime_type).startsWith("image/") ||
      msg.document.mime_type === "application/pdf")
      ? msg.document
      : null;
  if (photo || doc) {
    await handleMediaIntake(token, chatId, msg, photo, doc);
    return NextResponse.json({ ok: true });
  }

  const text: string = (msg?.text ?? "").trim();
  if (!text) return NextResponse.json({ ok: true });

  const [rawCmd, ...args] = text.split(/\s+/);
  const cmd = rawCmd.toLowerCase().replace(/@.*$/, ""); // strip @botname suffix
  const arg = args.join(" ").trim();

  try {
    if (cmd === "/start" || cmd === "/help") {
      reply(
        token,
        chatId,
        `👋 <b>${esc(settings.companyName || "TMS")} bot</b>\n\n` +
          `📸 Send a rate con photo or PDF → I'll create a draft load\n\n` +
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

// Read a rate confirmation photo/PDF sent to the bot and create a draft load,
// flagged needsReview so a dispatcher verifies it on the board. Requires the
// sender to be a linked user who is allowed to create loads.
async function handleMediaIntake(
  token: string,
  chatId: number | string,
  msg: any,
  photo: any,
  doc: any
) {
  try {
    const user = await prisma.user.findFirst({ where: { telegramChatId: String(chatId) } });
    if (!user) {
      reply(token, chatId, "🔒 Link your account first: /link CODE");
      return;
    }
    if (!can.createLoad(user.role)) {
      reply(token, chatId, "🔒 You don't have permission to create loads.");
      return;
    }
    if (!aiConfigured()) {
      reply(token, chatId, "⚠️ AI intake isn't configured on the server.");
      return;
    }

    reply(token, chatId, "📸 Reading your document…");

    const fileId = doc?.file_id ?? photo?.file_id;
    const file = await getTelegramFileDataUrl(token, fileId, doc?.mime_type);
    if (!file) {
      reply(token, chatId, "❌ Couldn't download the file (too large or unavailable).");
      return;
    }

    let x;
    try {
      x = await extractLoadFromDocument(file.dataUrl, file.mimeType);
    } catch {
      reply(token, chatId, "❌ Couldn't read the load from that document. Try a clearer photo.");
      return;
    }

    // Duplicate guard by reference number — never silently double-book.
    const dup = await findDuplicate(x);
    if (dup && dup.reason === "ref") {
      reply(token, chatId, `⚠️ Load <b>${esc(dup.refNumber)}</b> already exists. Skipped.`);
      return;
    }

    const [customer, profit] = await Promise.all([
      matchCustomer(x.broker),
      profitCheck(x.rate, x.miles),
    ]);

    const refNumber = x.refNumber?.trim() || fallbackRef();
    let load;
    try {
      load = await prisma.load.create({
        data: {
          refNumber,
          broker: customer ? null : x.broker,
          customerId: customer?.id ?? null,
          origin: x.origin || "—",
          destination: x.destination || "—",
          pickupDate: x.pickupDate ? new Date(x.pickupDate) : null,
          deliveryDate: x.deliveryDate ? new Date(x.deliveryDate) : null,
          rate: x.rate,
          miles: x.miles,
          weight: x.weight,
          commodity: x.commodity,
          equipment: (x.equipment as any) ?? "VAN",
          detention: x.detention,
          lumperFee: x.lumperFee,
          notes: x.notes,
          status: "NEW",
          dispatcherId: user.id,
          dispatcherName: user.name,
          aiGenerated: true,
          needsReview: true,
          source: "telegram",
        },
      });
    } catch (e: any) {
      reply(
        token,
        chatId,
        e?.code === "P2002"
          ? `⚠️ Load <b>${esc(refNumber)}</b> already exists. Skipped.`
          : "❌ Couldn't create the load. Try again."
      );
      return;
    }

    // Attach the original document to the load. Awaited: in a serverless
    // handler an unawaited write can be cut off once we return 200.
    await prisma.document
      .create({
        data: {
          name: doc?.file_name || `telegram-${refNumber}.${file.mimeType.split("/").pop()}`,
          category: "RATE_CON",
          mimeType: file.mimeType,
          size: doc?.file_size || 0,
          dataUrl: file.dataUrl,
          loadId: load.id,
          uploadedById: user.id,
          uploadedByName: user.name,
        },
      })
      .catch(() => {});

    await logActivity({ id: user.id, name: user.name, role: user.role } as any, "ai_extracted", "load", refNumber, "telegram");

    const rateLine = x.rate ? ` • $${Math.round(x.rate).toLocaleString("en-US")}` : "";
    const rpmLine =
      profit && profit.belowTarget
        ? `\n⚠️ Low rate: $${profit.rpm.toFixed(2)}/mi (target $${profit.targetRpm.toFixed(2)})`
        : "";
    const custLine = customer ? `\n🏢 ${esc(customer.name)}` : x.broker ? `\n🏢 ${esc(x.broker)} (new)` : "";
    reply(
      token,
      chatId,
      `✅ <b>Draft load ${esc(refNumber)}</b> created${rateLine}\n` +
        `${esc(x.origin || "—")} → ${esc(x.destination || "—")}${custLine}${rpmLine}\n` +
        `🤖 Please review it on the board before dispatching.`
    );
  } catch {
    // Swallow — Telegram must always get a 200.
  }
}
