import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";
import { getTelegramConfig, sendTelegramRaw } from "@/lib/telegram";

// Send a test message to the configured dispatch chat so an admin can verify
// the bot token + chat id are correct without waiting for a real event.
// Save settings first.
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageTelegram(session.role))
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
    `✅ <b>Uzlider TMS</b>\nTelegram is connected. Test message from ${session.name}.`
  );

  if (!result.ok)
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
