import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("DemoPassword123!", 10);

  await prisma.user.upsert({
    where: { username: "DemoUser1" },
    update: {},
    create: {
      username: "DemoUser1",
      universityEmail: "demo1@university.edu",
      passwordHash,
      role: "admin",
      name: "Demo User 1",
    },
  });
  
  await prisma.user.upsert({
    where: { username: "DemoUser2" },
    update: {},
    create: {
      username: "DemoUser2",
      universityEmail: "demo2@university.edu",
      passwordHash,
      role: "admin",
      name: "Demo User 2",
    },
  });

  const seedUsername = process.env.SEED_USERNAME;
  const seedPassword = process.env.SEED_PASSWORD;
  const seedEmail = process.env.SEED_EMAIL;
  const seedName = process.env.SEED_NAME || seedUsername;

  if (seedUsername && seedPassword && seedEmail) {
    const seedHash = await bcrypt.hash(seedPassword, 10);
    await prisma.user.upsert({
      where: { username: seedUsername },
      update: {},
      create: {
        username: seedUsername,
        universityEmail: seedEmail,
        passwordHash: seedHash,
        role: process.env.SEED_ROLE || "user",
        name: seedName || "Seed User",
      },
    });
    console.log(`Seeded runtime user: ${seedUsername}`);
  } else {
    console.log("No SEED_USERNAME/SEED_PASSWORD/SEED_EMAIL provided; skipping seed user creation.");
  }

  console.log({ passwordHash });
  console.log("Seeded default admin user: DemoUser1 / DemoPassword123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
