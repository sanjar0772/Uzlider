import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";
import { getTelegramConfig, sendTelegramRaw } from "@/lib/telegram";

// Sends a test message using the stored Telegram configuration so the admin
// can confirm the bot token + chat id are correct. Save settings first.
export async function POST() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageUsers(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cfg = await getTelegramConfig();
  if (!cfg.token || !cfg.chatId)
    return NextResponse.json(
      { ok: false, error: "Bot token and chat ID are required" },
      { status: 400 }
    );

  const result = await sendTelegramRaw(
    cfg.token,
    cfg.chatId,
    `✅ <b>Uzlider TMS</b>\nTelegram integratsiyasi ishlayapti!`
  );

  if (!result.ok)
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
