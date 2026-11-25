// Клиент собственного PostgreSQL. Только для сервера.
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

// globalThis: в dev горячая перезагрузка перечитывает модуль и без этого плодила бы пулы соединений.
const globalForDb = globalThis as typeof globalThis & { readingTrackerDb?: Database };

function createDb(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  // UTC: от часового пояса соединения зависит, в каком виде приходят даты (см. timestamptz.ts).
  const client = postgres(url, { connection: { TimeZone: "UTC" } });
  return drizzle(client, { schema });
}

/** Один клиент на процесс. Создаётся при первом запросе: сборке `DATABASE_URL` не нужен. */
export function getDb(): Database {
  return (globalForDb.readingTrackerDb ??= createDb());
}
