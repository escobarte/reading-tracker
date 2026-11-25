// Общие части запросов Drizzle.
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb, type Executor, type Transaction } from "@/db";
import { books, readings } from "@/db/schema";
import { requireUserId } from "@/lib/require-user";
import type { Reading } from "./types";

/** Запрос обязан вернуть строку: пустой результат — ошибка (нет записи или она чужая). */
export function firstOrThrow<T>(rows: T[]): T {
  const [row] = rows;
  if (!row) throw new Error("Row not found");
  return row;
}

/**
 * Транзакция для изменений из нескольких шагов: либо применяются все, либо ни одного.
 * Блокировка по пользователю выполняет такие транзакции по очереди, иначе два одновременных
 * действия могли бы выдать один номер в очереди или открыть два прочтения.
 * Внутри все запросы идут через `tx`: вызов `getDb()` или другой `userTransaction`
 * взял бы второе соединение, не видел бы изменений и мог бы зависнуть на блокировке.
 */
export async function userTransaction<T>(run: (tx: Transaction, userId: string) => Promise<T>): Promise<T> {
  const userId = await requireUserId();
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
    return run(tx, userId);
  });
}

// Внешний ключ проверяет только существование записи, не владельца. Поэтому перед вставкой
// по id, пришедшему снаружи, владельца проверяет код.

export async function assertOwnBook(db: Executor, userId: string, bookId: string): Promise<void> {
  firstOrThrow(
    await db
      .select({ id: books.id })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.user_id, userId))),
  );
}

export async function assertOwnReading(db: Executor, userId: string, readingId: string): Promise<void> {
  firstOrThrow(
    await db
      .select({ id: readings.id })
      .from(readings)
      .where(and(eq(readings.id, readingId), eq(readings.user_id, userId))),
  );
}

/** Открытое прочтение книги (начатое последним) или `null`. */
export async function findOpenReading(db: Executor, userId: string, bookId: string): Promise<Reading | null> {
  const [reading] = await db
    .select()
    .from(readings)
    .where(and(eq(readings.user_id, userId), eq(readings.book_id, bookId), isNull(readings.finished_at)))
    .orderBy(desc(readings.started_at))
    .limit(1);
  return reading ?? null;
}

/** Открытое прочтение своей книги; если его нет, создаёт. */
export async function ensureOpenReadingIn(tx: Transaction, userId: string, bookId: string): Promise<Reading> {
  const existing = await findOpenReading(tx, userId, bookId);
  if (existing) return existing;

  await assertOwnBook(tx, userId, bookId);
  return firstOrThrow(
    await tx
      .insert(readings)
      .values({ user_id: userId, book_id: bookId, started_at: new Date().toISOString() })
      .returning(),
  );
}
