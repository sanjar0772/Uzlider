import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";
import { sendTelegramMessage } from "@/lib/telegram";

// Send a test message to the configured dispatch chat so an admin can verify
// the bot token + chat id are correct without waiting for a real event.
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageTelegram(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const s = await prisma.companySettings.findFirst();
  if (!s?.telegramBotToken)
    return NextResponse.json({ error: "No bot token configured" }, { status: 400 });
  if (!s.telegramChatId)
    return NextResponse.json({ error: "No chat id configured" }, { status: 400 });

  const res = await sendTelegramMessage(
    s.telegramBotToken,
    s.telegramChatId,
    `✅ <b>${s.companyName || "TMS"}</b>\nTelegram is connected. Test message from ${session.name}.`
  );

  if (!res?.ok)
    return NextResponse.json(
      { error: res?.description || "Telegram rejected the message" },
      { status: 502 }
    );

  return NextResponse.json({ ok: true });
}
