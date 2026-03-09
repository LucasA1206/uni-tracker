import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const isPostgres = process.argv.some(arg => arg.includes("schema.postgres.prisma"));

export default defineConfig({
  schema: isPostgres ? "prisma/schema.postgres.prisma" : "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: isPostgres ? env("POSTGRES_PRISMA_URL") : env("DATABASE_URL"),
  },
});
