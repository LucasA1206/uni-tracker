import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("SuperD00per", 10);

  await prisma.user.upsert({
    where: { username: "LucasA06" },
    update: {},
    create: {
      username: "LucasA06",
      passwordHash,
      role: "admin",
    },
  });

  console.log("Seeded default admin user: LucasA06 / SuperD00per");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
