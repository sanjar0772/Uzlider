import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Personal Telegram linking for the signed-in user.
//
// GET  → current link status (whether a Telegram account is connected).
// POST → generate a fresh one-time link code the user sends to the bot as
//        "/link CODE" to connect their Telegram account.
// DELETE → disconnect the linked Telegram account.

function genCode() {
  // 6-char human-friendly code, no ambiguous characters.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++)
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { telegramChatId: true, telegramUsername: true, telegramLinkCode: true },
  });
  return NextResponse.json({
    connected: !!user?.telegramChatId,
    username: user?.telegramUsername ?? null,
    code: user?.telegramLinkCode ?? null,
  });
}

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Retry a few times on the tiny chance of a code collision (unique column).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode();
    try {
      await prisma.user.update({
        where: { id: session.id },
        data: { telegramLinkCode: code, telegramChatId: null, telegramUsername: null },
      });
      return NextResponse.json({ code });
    } catch (e: any) {
      if (e.code === "P2002") continue; // code already used, try another
      return NextResponse.json({ error: "Failed to generate code" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Failed to generate code" }, { status: 500 });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.user.update({
    where: { id: session.id },
    data: { telegramChatId: null, telegramUsername: null, telegramLinkCode: null },
  });
  return NextResponse.json({ ok: true });
}
