import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { books, readings, sessions } from "@/db/schema";
import { requireUserId } from "@/lib/require-user";
import { computeStreak, localDateKey, localDayRangeUtc } from "@/lib/time";
import { setShelf } from "./books";
import { assertOwnReading, firstOrThrow } from "./query";
import type { ReadingSession, SessionSource } from "./types";

export type CreateSessionInput = {
  reading_id: string;
  started_at: string;
  ended_at: string;
  page_from: number;
  page_to: number;
  seconds: number;
  source: SessionSource;
};

/** Сессия по id, только своя. */
function ownSession(userId: string, id: string) {
  return and(eq(sessions.id, id), eq(sessions.user_id, userId));
}

/** Сессии прочтения, только свои. */
function ownSessionsOfReading(userId: string, readingId: string) {
  return and(eq(sessions.user_id, userId), eq(sessions.reading_id, readingId));
}

const maxPageOrder = sql`${sessions.page_to} desc nulls last`;

export async function createSession(input: CreateSessionInput): Promise<ReadingSession> {
  const userId = await requireUserId();
  await assertOwnReading(userId, input.reading_id);
  return firstOrThrow(
    await getDb()
      .insert(sessions)
      .values({
        user_id: userId,
        reading_id: input.reading_id,
        started_at: input.started_at,
        ended_at: input.ended_at,
        page_from: input.page_from,
        page_to: input.page_to,
        pages_read: input.page_to - input.page_from,
        seconds: input.seconds,
        source: input.source,
      })
      .returning(),
  );
}

export async function listRecentSessions(readingId: string, limit = 5): Promise<ReadingSession[]> {
  const userId = await requireUserId();
  return getDb()
    .select()
    .from(sessions)
    .where(ownSessionsOfReading(userId, readingId))
    .orderBy(desc(sessions.started_at))
    .limit(limit);
}

/** All sessions of a reading, newest first — for the "all history" screen. */
export async function listAllSessions(readingId: string): Promise<ReadingSession[]> {
  const userId = await requireUserId();
  return getDb()
    .select()
    .from(sessions)
    .where(ownSessionsOfReading(userId, readingId))
    .orderBy(desc(sessions.started_at));
}

export async function getSession(id: string): Promise<ReadingSession | null> {
  const userId = await requireUserId();
  const [session] = await getDb().select().from(sessions).where(ownSession(userId, id));
  return session ?? null;
}

export type UpdateSessionInput = {
  started_at: string;
  ended_at: string;
  page_from: number;
  page_to: number;
  seconds: number;
};

export async function updateSession(id: string, input: UpdateSessionInput): Promise<ReadingSession> {
  const userId = await requireUserId();
  return firstOrThrow(
    await getDb()
      .update(sessions)
      .set({
        started_at: input.started_at,
        ended_at: input.ended_at,
        page_from: input.page_from,
        page_to: input.page_to,
        pages_read: input.page_to - input.page_from,
        seconds: input.seconds,
      })
      .where(ownSession(userId, id))
      .returning(),
  );
}

export async function deleteSession(id: string): Promise<void> {
  const userId = await requireUserId();
  await getDb().delete(sessions).where(ownSession(userId, id));
}

/** page_to of the latest session of a reading, or 0 if there is none. */
export async function getMaxPageForReading(readingId: string): Promise<number> {
  const userId = await requireUserId();
  const [session] = await getDb()
    .select({ page_to: sessions.page_to })
    .from(sessions)
    .where(ownSessionsOfReading(userId, readingId))
    .orderBy(maxPageOrder)
    .limit(1);
  return session?.page_to ?? 0;
}

/** page_to of the latest session of the book's open reading, or 0 if there is none. */
export async function getCurrentPage(bookId: string): Promise<number> {
  const userId = await requireUserId();
  const [reading] = await getDb()
    .select({ id: readings.id })
    .from(readings)
    .where(and(eq(readings.user_id, userId), eq(readings.book_id, bookId)))
    .orderBy(desc(readings.started_at))
    .limit(1);
  if (!reading) return 0;

  return getMaxPageForReading(reading.id);
}

export type SyncResult = { justFinished: boolean; needsRevertConfirm: boolean };

/**
 * Keeps the reading's finished state consistent with the sessions that back it:
 * closes the reading when a session reaches the last page, and flags for confirmation
 * when an edit or delete leaves a finished reading short of the last page.
 */
export async function syncReadingCompletion(bookId: string, readingId: string): Promise<SyncResult> {
  const userId = await requireUserId();
  const db = getDb();
  const [bookRows, readingRows] = await Promise.all([
    db
      .select({ total_pages: books.total_pages })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.user_id, userId))),
    db
      .select({ finished_at: readings.finished_at })
      .from(readings)
      .where(and(eq(readings.id, readingId), eq(readings.user_id, userId))),
  ]);
  const book = firstOrThrow(bookRows);
  const reading = firstOrThrow(readingRows);

  if (!book.total_pages) return { justFinished: false, needsRevertConfirm: false };

  const [maxRow] = await db
    .select({ page_to: sessions.page_to, ended_at: sessions.ended_at, started_at: sessions.started_at })
    .from(sessions)
    .where(ownSessionsOfReading(userId, readingId))
    .orderBy(maxPageOrder)
    .limit(1);

  const maxPageTo = maxRow?.page_to ?? 0;
  const reachedEnd = maxPageTo >= book.total_pages;

  if (reachedEnd && !reading.finished_at) {
    const finishedAt = maxRow?.ended_at ?? maxRow?.started_at ?? new Date().toISOString();
    await db
      .update(readings)
      .set({ finished_at: finishedAt })
      .where(and(eq(readings.id, readingId), eq(readings.user_id, userId)));
    await setShelf(bookId, "done");
    return { justFinished: true, needsRevertConfirm: false };
  }

  if (!reachedEnd && reading.finished_at) {
    return { justFinished: false, needsRevertConfirm: true };
  }

  return { justFinished: false, needsRevertConfirm: false };
}

export type ReadingStats = {
  totalMinutes: number;
  sessionCount: number;
  pagesPerHour: number | null;
  avgSessionMinutes: number | null;
};

export async function getReadingStats(readingId: string): Promise<ReadingStats> {
  const userId = await requireUserId();
  const rows = await getDb()
    .select({ seconds: sessions.seconds, pages_read: sessions.pages_read })
    .from(sessions)
    .where(ownSessionsOfReading(userId, readingId));

  const totalSeconds = rows.reduce((sum, s) => sum + (s.seconds ?? 0), 0);
  const totalPages = rows.reduce((sum, s) => sum + (s.pages_read ?? 0), 0);
  const sessionCount = rows.length;
  const totalMinutes = Math.round(totalSeconds / 60);

  return {
    totalMinutes,
    sessionCount,
    pagesPerHour: totalSeconds > 0 ? Math.round((totalPages / totalSeconds) * 3600) : null,
    avgSessionMinutes: sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : null,
  };
}

export type ReadingWrapupStats = { days: number; minutes: number; pages: number };

/** Дни, время и страницы прочтения — считается по сессиям, для плиток экрана «Книга прочитана». */
export async function getReadingWrapupStats(readingId: string): Promise<ReadingWrapupStats> {
  const userId = await requireUserId();
  const rows = await getDb()
    .select({ started_at: sessions.started_at, seconds: sessions.seconds, pages_read: sessions.pages_read })
    .from(sessions)
    .where(ownSessionsOfReading(userId, readingId));

  const minutes = Math.round(rows.reduce((sum, s) => sum + (s.seconds ?? 0), 0) / 60);
  const pages = rows.reduce((sum, s) => sum + (s.pages_read ?? 0), 0);
  const days = new Set(rows.map((s) => localDateKey(s.started_at))).size;
  return { days, minutes, pages };
}

export type TodaySummary = { pages: number; minutes: number; sessionCount: number };

/** cache(): несколько компонентов одного запроса (layout, Sidebar, сама страница) читают сводку за сегодня один раз. */
export const getTodaySummary = cache(async (): Promise<TodaySummary> => {
  const userId = await requireUserId();
  const { start, end } = localDayRangeUtc();
  const rows = await getDb()
    .select({ pages_read: sessions.pages_read, seconds: sessions.seconds })
    .from(sessions)
    .where(
      and(
        eq(sessions.user_id, userId),
        gte(sessions.started_at, start.toISOString()),
        lt(sessions.started_at, end.toISOString()),
      ),
    );

  const pages = rows.reduce((sum, s) => sum + (s.pages_read ?? 0), 0);
  const seconds = rows.reduce((sum, s) => sum + (s.seconds ?? 0), 0);
  return { pages, minutes: Math.round(seconds / 60), sessionCount: rows.length };
});

export async function getStreakDays(): Promise<number> {
  const userId = await requireUserId();
  const since = new Date(Date.now() - 400 * 86400000).toISOString();
  const rows = await getDb()
    .select({ started_at: sessions.started_at })
    .from(sessions)
    .where(and(eq(sessions.user_id, userId), gte(sessions.started_at, since)));

  const keys = new Set(rows.map((s) => localDateKey(s.started_at)));
  return computeStreak(keys);
}
