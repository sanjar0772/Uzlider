import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isDocCategory } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

// Max stored file size (data URL bytes). Files are kept inline in the DB, so
// keep this modest — big scans should be compressed client-side first.
const MAX_BYTES = 6 * 1024 * 1024;

// List document metadata (never the file body) for one owner:
//   ?loadId=..  or  ?driverId=..  or  ?truckId=..
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const loadId = searchParams.get("loadId");
  const driverId = searchParams.get("driverId");
  const truckId = searchParams.get("truckId");
  const where: any = {};
  if (loadId) where.loadId = loadId;
  else if (driverId) where.driverId = driverId;
  else if (truckId) where.truckId = truckId;
  else return NextResponse.json({ documents: [] });

  const documents = await prisma.document.findMany({
    where,
    select: {
      id: true, name: true, category: true, mimeType: true, size: true,
      uploadedByName: true, createdAt: true, loadId: true, driverId: true, truckId: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ documents });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageDocuments(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.name || !body.dataUrl || !body.mimeType)
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (typeof body.dataUrl !== "string" || !body.dataUrl.startsWith("data:"))
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  if (body.dataUrl.length > MAX_BYTES)
    return NextResponse.json({ error: "File too large (max 6 MB)" }, { status: 413 });
  if (body.category && !isDocCategory(body.category))
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  if (!body.loadId && !body.driverId && !body.truckId)
    return NextResponse.json({ error: "No owner" }, { status: 400 });

  const document = await prisma.document.create({
    data: {
      name: String(body.name).slice(0, 200),
      category: body.category || "OTHER",
      mimeType: body.mimeType,
      size: Number(body.size) || 0,
      dataUrl: body.dataUrl,
      loadId: body.loadId || null,
      driverId: body.driverId || null,
      truckId: body.truckId || null,
      uploadedById: session.id,
      uploadedByName: session.name,
    },
    select: { id: true, name: true, category: true },
  });
  await logActivity(session, "uploaded", "document", document.name, document.category);
  return NextResponse.json({ document });
}
