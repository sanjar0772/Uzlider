import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

// Fetch a single document including its file body (for download / preview).
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const document = await prisma.document.findUnique({ where: { id: params.id } });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ document });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageDocuments(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  await prisma.document.delete({ where: { id: params.id } });
  await logActivity(session, "deleted", "document", doc?.name);
  return NextResponse.json({ ok: true });
}
