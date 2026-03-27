import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const postgresUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || "";
const isPostgres = isVercel || postgresUrl.startsWith("postgres://") || postgresUrl.startsWith("postgresql://");
const urlSource = isPostgres && process.env.POSTGRES_PRISMA_URL ? "POSTGRES_PRISMA_URL" : "DATABASE_URL";

export default defineConfig({
  schema: isPostgres ? "prisma/schema.postgres.prisma" : "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env(urlSource),
  },
});
