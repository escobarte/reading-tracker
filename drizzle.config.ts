import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit сам не читает .env.local (это делает только Next.js).
// Переменная из окружения имеет приоритет над файлом.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
