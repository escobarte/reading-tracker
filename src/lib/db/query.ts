// Общие части запросов Drizzle.
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { books, readings } from "@/db/schema";

/** Запрос обязан вернуть строку: пустой результат — ошибка (нет записи или она чужая). */
export function firstOrThrow<T>(rows: T[]): T {
  const [row] = rows;
  if (!row) throw new Error("Row not found");
  return row;
}

// Внешний ключ проверяет только существование записи, не владельца. Поэтому перед вставкой
// по id, пришедшему снаружи, владельца проверяет код.

export async function assertOwnBook(userId: string, bookId: string): Promise<void> {
  firstOrThrow(
    await getDb()
      .select({ id: books.id })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.user_id, userId))),
  );
}

export async function assertOwnReading(userId: string, readingId: string): Promise<void> {
  firstOrThrow(
    await getDb()
      .select({ id: readings.id })
      .from(readings)
      .where(and(eq(readings.id, readingId), eq(readings.user_id, userId))),
  );
}
