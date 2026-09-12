import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log(`Seed skipped — database already has ${existing} user(s).`);
    return;
  }

  console.log("Seeding database...");

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // Drivers (profiles)
  const john = await prisma.driver.create({
    data: {
      name: "John Miller",
      phone: "+1 312 555 0101",
      truckNumber: "T-101",
      trailerNumber: "TR-55",
      licenseNumber: "IL-8842213",
      status: "ON_LOAD",
    },
  });
  const carlos = await prisma.driver.create({
    data: {
      name: "Carlos Ramirez",
      phone: "+1 713 555 0144",
      truckNumber: "T-102",
      trailerNumber: "TR-56",
      licenseNumber: "TX-1123908",
      status: "AVAILABLE",
    },
  });
  const dmitry = await prisma.driver.create({
    data: {
      name: "Dmitry Ivanov",
      phone: "+1 646 555 0177",
      truckNumber: "T-103",
      trailerNumber: "TR-57",
      licenseNumber: "NY-6690021",
      status: "AVAILABLE",
    },
  });

  // Users / accounts — one per role
  await prisma.user.create({
    data: {
      name: "Sanjar (Owner)",
      email: "owner@uzlider.com",
      passwordHash: hash("owner123"),
      role: "OWNER",
      phone: "+1 312 555 0001",
    },
  });
  await prisma.user.create({
    data: {
      name: "Maria Manager",
      email: "manager@uzlider.com",
      passwordHash: hash("manager123"),
      role: "MANAGER",
    },
  });
  await prisma.user.create({
    data: {
      name: "Dave Dispatcher",
      email: "dispatch@uzlider.com",
      passwordHash: hash("dispatch123"),
      role: "DISPATCHER",
    },
  });
  await prisma.user.create({
    data: {
      name: "Umid Updater",
      email: "updater@uzlider.com",
      passwordHash: hash("updater123"),
      role: "UPDATER",
    },
  });
  // A driver login linked to John's profile
  await prisma.user.create({
    data: {
      name: "John Miller",
      email: "driver@uzlider.com",
      passwordHash: hash("driver123"),
      role: "DRIVER",
      driverId: john.id,
    },
  });

  // Loads
  const now = new Date();
  const day = (n: number) => new Date(now.getTime() + n * 86400000);

  await prisma.load.create({
    data: {
      refNumber: "LD-1001",
      broker: "TQL",
      origin: "Chicago, IL",
      destination: "Dallas, TX",
      pickupDate: day(0),
      deliveryDate: day(2),
      rate: 2450,
      miles: 925,
      status: "IN_TRANSIT",
      driverId: john.id,
      dispatcherName: "Dave Dispatcher",
      notes: "Reefer load, keep at 34F.",
      updates: {
        create: [
          {
            status: "ASSIGNED",
            note: "Assigned to John Miller",
            authorName: "Dave Dispatcher",
          },
          {
            status: "IN_TRANSIT",
            location: "St. Louis, MO",
            note: "Picked up on time, heading south.",
            authorName: "Umid Updater",
          },
        ],
      },
    },
  });

  await prisma.load.create({
    data: {
      refNumber: "LD-1002",
      broker: "CH Robinson",
      origin: "Houston, TX",
      destination: "Atlanta, GA",
      pickupDate: day(1),
      deliveryDate: day(3),
      rate: 1980,
      miles: 790,
      status: "ASSIGNED",
      driverId: carlos.id,
      dispatcherName: "Dave Dispatcher",
    },
  });

  await prisma.load.create({
    data: {
      refNumber: "LD-1003",
      broker: "Coyote",
      origin: "New York, NY",
      destination: "Miami, FL",
      pickupDate: day(2),
      deliveryDate: day(4),
      rate: 2760,
      miles: 1280,
      status: "NEW",
      dispatcherName: "Dave Dispatcher",
      notes: "Needs a driver ASAP.",
    },
  });

  await prisma.load.create({
    data: {
      refNumber: "LD-0999",
      broker: "TQL",
      origin: "Los Angeles, CA",
      destination: "Phoenix, AZ",
      pickupDate: day(-3),
      deliveryDate: day(-2),
      rate: 1150,
      miles: 375,
      status: "DELIVERED",
      driverId: dmitry.id,
      dispatcherName: "Dave Dispatcher",
    },
  });

  console.log("Done. Demo accounts:");
  console.log("  owner@uzlider.com / owner123");
  console.log("  manager@uzlider.com / manager123");
  console.log("  dispatch@uzlider.com / dispatch123");
  console.log("  updater@uzlider.com / updater123");
  console.log("  driver@uzlider.com / driver123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
