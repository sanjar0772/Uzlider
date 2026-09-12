import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Production-safe seed.
// - Creates ONE owner/admin account only if the database has no users.
// - Owner credentials come from env (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME),
//   falling back to admin@uzlider.com / admin123 (change it after first login).
// - Set RESET_DEMO=true (once) to wipe ALL data before seeding — useful to clear
//   old demo records, then remove the variable again.
async function main() {
  // One-time demo wipe. Safe to leave RESET_DEMO=true forever: it only wipes
  // once (guarded by a marker row), so it will never delete real data later.
  if (process.env.RESET_DEMO === "true") {
    const alreadyReset = await prisma.activity
      .findFirst({ where: { action: "reset_demo", entity: "system" } })
      .catch(() => null);

    if (!alreadyReset) {
      await prisma.invoice.deleteMany();
      await prisma.loadUpdate.deleteMany();
      await prisma.load.deleteMany();
      await prisma.truck.deleteMany();
      await prisma.customer.deleteMany();
      await prisma.user.deleteMany();
      await prisma.driver.deleteMany();
      await prisma.activity.deleteMany();
      await prisma.activity.create({
        data: {
          action: "reset_demo",
          entity: "system",
          actorName: "System",
          detail: "Demo data cleared (one-time)",
        },
      });
      console.log("RESET_DEMO → demo data cleared (one-time).");
    } else {
      console.log("RESET_DEMO already applied earlier — no wipe.");
    }
  }

  const count = await prisma.user.count();
  if (count > 0) {
    console.log(`Seed skipped — database already has ${count} user(s).`);
    return;
  }

  const email = (process.env.ADMIN_EMAIL || "admin@uzlider.com")
    .toLowerCase()
    .trim();
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const name = process.env.ADMIN_NAME || "Administrator";

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      role: "OWNER",
    },
  });

  console.log("Created owner account:");
  console.log(`  ${email} / ${password}`);
  console.log("Change this password after your first login (Profile page).");
}

main()
  .catch((e) => {
    // Never let a seed error crash the container boot.
    console.error("Seed error (continuing):", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
