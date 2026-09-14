import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { aiConfigured, extractLoadFromDocument } from "@/lib/ai";
import { matchCustomer, findDuplicate, profitCheck } from "@/lib/loadExtract";

// Same inline-storage cap as the documents API.
const MAX_BYTES = 6 * 1024 * 1024;
const ACCEPTED = /^(image\/(jpeg|png|gif|webp)|application\/pdf)$/;

// POST /api/loads/extract — read a rate confirmation (image or PDF) and return a
// pre-filled load draft for the dispatcher to review. Does NOT create a load.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.createLoad(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!aiConfigured())
    return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const { dataUrl, mimeType } = body ?? {};
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:"))
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  if (typeof mimeType !== "string" || !ACCEPTED.test(mimeType))
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  if (dataUrl.length > MAX_BYTES)
    return NextResponse.json({ error: "File too large (max 6 MB)" }, { status: 413 });

  let extracted;
  try {
    extracted = await extractLoadFromDocument(dataUrl, mimeType);
  } catch (e: any) {
    if (e?.message === "AI_NOT_CONFIGURED")
      return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
    return NextResponse.json({ error: "EXTRACT_FAILED" }, { status: 502 });
  }

  const [customer, duplicate, profit] = await Promise.all([
    matchCustomer(extracted.broker),
    findDuplicate(extracted),
    profitCheck(extracted.rate, extracted.miles),
  ]);

  await logActivity(session, "ai_extracted", "load", extracted.refNumber, extracted.documentType);

  return NextResponse.json({
    draft: extracted,
    customerMatch: customer,
    duplicate,
    profit,
  });
}
