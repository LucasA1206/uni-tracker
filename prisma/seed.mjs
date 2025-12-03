import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("LiverpoolSucks123", 10);

  await prisma.user.upsert({
    where: { username: "LucasA06" },
    update: {},
    create: {
      username: "LucasA06",
      passwordHash,
      role: "admin",
      name: "LucasA06",
    },
  }),
    await prisma.user.upsert({
        where: { username: "Riley001" },
        update: {},
        create: {
        username: "Riley001",
        passwordHash,
        role: "admin",
        name: "Riley001",
        },
  });

  console.log({ passwordHash });
  console.log("Seeded default admin user: LucasA06 / LiverpoolSucks123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
