import { customType } from "drizzle-orm/pg-core";

/**
 * Приводит текст Postgres (`2026-11-12 05:58:14.041+00`) к ISO 8601 в том виде, в каком
 * его отдавал Supabase: `2026-11-12T05:58:14.041+00:00`. Микросекунды сохраняются.
 * Строки одного формата можно сравнивать между собой (`localeCompare`, `>`), пока
 * соединение работает в UTC (задано в `src/db/index.ts`).
 */
export function toIsoTimestamp(value: string): string {
  return value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
}

/** `timestamp with time zone`, в коде — ISO-строка. */
export const timestamptz = customType<{ data: string; driverData: string }>({
  dataType: () => "timestamp with time zone",
  fromDriver: toIsoTimestamp,
});
