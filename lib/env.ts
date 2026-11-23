/**
 * Startup environment variable validation.
 * Ensures required credentials and configuration exist before processing requests.
 */

interface EnvConfig {
  DATABASE_URL: string;
  JWT_SECRET: string;
  NODE_ENV: string;
  GEMINI_API_KEY?: string;
  CANVAS_BASE_URL?: string;
}

function validateEnv(): EnvConfig {
  const missing: string[] = [];

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (!dbUrl) {
    missing.push("DATABASE_URL or POSTGRES_PRISMA_URL");
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    missing.push("JWT_SECRET");
  } else if (process.env.NODE_ENV === "production" && jwtSecret.length < 32) {
    console.warn(
      "[SECURITY WARNING] JWT_SECRET is shorter than 32 characters. A cryptographically strong secret of at least 256 bits is recommended."
    );
  }

  if (missing.length > 0) {
    const errorMsg = `[CRITICAL CONFIG ERROR] Missing required environment variables: ${missing.join(", ")}. Please check your .env file or hosting environment.`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(errorMsg);
    } else {
      console.error(errorMsg);
    }
  }

  return {
    DATABASE_URL: dbUrl || "file:./dev.db",
    JWT_SECRET: jwtSecret || "dev-fallback-insecure-secret-key-change-me",
    NODE_ENV: process.env.NODE_ENV || "development",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    CANVAS_BASE_URL: process.env.CANVAS_BASE_URL,
  };
}

export const env = validateEnv();
