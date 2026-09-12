import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";

const SINGLETON = "company";

async function getOrCreate() {
  let s = await prisma.companySettings.findFirst();
  if (!s) {
    s = await prisma.companySettings.create({ data: { id: SINGLETON } });
  }
  return s;
}

// Never leak the bot token to the client. Expose a boolean instead so the UI
// can show a "configured" state and offer to replace it.
function redact(s: any) {
  const { telegramBotToken, ...rest } = s;
  return { ...rest, telegramBotTokenSet: !!telegramBotToken };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getOrCreate();
  return NextResponse.json({ settings: redact(settings) });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageSettings(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await getOrCreate();
  const body = await req.json();
  const data: any = {};

  // Cost assumptions
  if (body.companyName !== undefined) data.companyName = body.companyName;
  if (body.mpg !== undefined) data.mpg = Number(body.mpg);
  if (body.fuelPricePerGallon !== undefined)
    data.fuelPricePerGallon = Number(body.fuelPricePerGallon);
  if (body.fixedCostPerMile !== undefined)
    data.fixedCostPerMile = Number(body.fixedCostPerMile);
  if (body.targetRpm !== undefined) data.targetRpm = Number(body.targetRpm);
  if (body.factoringRatePct !== undefined)
    data.factoringRatePct = Number(body.factoringRatePct);

  // Telegram — only admins may reach here (manageSettings === manageTelegram).
  if (body.telegramEnabled !== undefined)
    data.telegramEnabled = !!body.telegramEnabled;
  if (body.telegramChatId !== undefined)
    data.telegramChatId = body.telegramChatId?.trim() || null;
  if (body.notifyNewLoad !== undefined) data.notifyNewLoad = !!body.notifyNewLoad;
  if (body.notifyStatus !== undefined) data.notifyStatus = !!body.notifyStatus;
  if (body.notifyInvoicePaid !== undefined)
    data.notifyInvoicePaid = !!body.notifyInvoicePaid;
  if (body.notifyCompliance !== undefined)
    data.notifyCompliance = !!body.notifyCompliance;
  // Token: only overwrite when a non-empty value is supplied. An empty string
  // explicitly clears it; undefined leaves the stored token untouched.
  if (body.telegramBotToken !== undefined) {
    const token = String(body.telegramBotToken).trim();
    if (token === "") data.telegramBotToken = null;
    else if (/^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(token)) data.telegramBotToken = token;
    else
      return NextResponse.json(
        { error: "Invalid bot token format" },
        { status: 400 }
      );
  }

  const settings = await prisma.companySettings.update({
    where: { id: existing.id },
    data,
  });
  return NextResponse.json({ settings: redact(settings) });
}
