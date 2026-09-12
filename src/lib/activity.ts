import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

export async function logActivity(
  actor: SessionUser | null,
  action: string,
  entity: string,
  entityRef?: string | null,
  detail?: string | null
) {
  try {
    await prisma.activity.create({
      data: {
        actorId: actor?.id ?? null,
        actorName: actor?.name ?? "System",
        action,
        entity,
        entityRef: entityRef ?? null,
        detail: detail ?? null,
      },
    });
  } catch {
    // Never let logging break the main request.
  }
}
