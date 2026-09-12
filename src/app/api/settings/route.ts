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

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getOrCreate();
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.manageUsers(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await getOrCreate();
  const body = await req.json();
  const data: any = {};
  if (body.companyName !== undefined) data.companyName = body.companyName;
  if (body.mpg !== undefined) data.mpg = Number(body.mpg);
  if (body.fuelPricePerGallon !== undefined)
    data.fuelPricePerGallon = Number(body.fuelPricePerGallon);
  if (body.fixedCostPerMile !== undefined)
    data.fixedCostPerMile = Number(body.fixedCostPerMile);
  if (body.targetRpm !== undefined) data.targetRpm = Number(body.targetRpm);
  if (body.factoringRatePct !== undefined)
    data.factoringRatePct = Number(body.factoringRatePct);

  const settings = await prisma.companySettings.update({
    where: { id: existing.id },
    data,
  });
  return NextResponse.json({ settings });
}
