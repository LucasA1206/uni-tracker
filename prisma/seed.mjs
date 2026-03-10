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
