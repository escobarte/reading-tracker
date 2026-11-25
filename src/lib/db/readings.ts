import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { readings } from "@/db/schema";
import type { PauseReasonCode } from "@/lib/pause-reasons";
import { requireUserId } from "@/lib/require-user";
import { setShelf } from "./books";
import { assertOwnBook, firstOrThrow } from "./query";
import type { Reading } from "./types";

/** Прочтение по id, только своё. */
function ownReading(userId: string, id: string) {
  return and(eq(readings.id, id), eq(readings.user_id, userId));
}

/** Прочтения книги, только свои. */
function ownReadingsOfBook(userId: string, bookId: string) {
  return and(eq(readings.user_id, userId), eq(readings.book_id, bookId));
}

export async function getOpenReading(bookId: string): Promise<Reading | null> {
  const userId = await requireUserId();
  const [reading] = await getDb()
    .select()
    .from(readings)
    .where(and(ownReadingsOfBook(userId, bookId), isNull(readings.finished_at)))
    .orderBy(desc(readings.started_at))
    .limit(1);
  return reading ?? null;
}

/** The book's most recent reading, open or finished — the one progress and history are shown for. */
export async function getLatestReading(bookId: string): Promise<Reading | null> {
  const userId = await requireUserId();
  const [reading] = await getDb()
    .select()
    .from(readings)
    .where(ownReadingsOfBook(userId, bookId))
    .orderBy(desc(readings.started_at))
    .limit(1);
  return reading ?? null;
}

/** Последнее закрытое прочтение книги (не брошенное) — то, для которого показывается экран «Книга прочитана». */
export async function getLatestFinishedReading(bookId: string): Promise<Reading | null> {
  const userId = await requireUserId();
  const [reading] = await getDb()
    .select()
    .from(readings)
    .where(
      and(ownReadingsOfBook(userId, bookId), isNotNull(readings.finished_at), eq(readings.is_dropped, false)),
    )
    .orderBy(desc(readings.finished_at))
    .limit(1);
  return reading ?? null;
}

const WRAPUP_TEXT_MAX = 5000;

function clampWrapupText(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, WRAPUP_TEXT_MAX);
}

export type ReadingWrapupInput = {
  rating: number | null;
  review: string | null;
  takeaway: string | null;
};

/** Сохраняет оценку, отзыв и итог прочтения; любое поле можно оставить пустым. Запись только в своё прочтение. */
export async function saveReadingWrapup(readingId: string, input: ReadingWrapupInput): Promise<Reading> {
  const userId = await requireUserId();
  return firstOrThrow(
    await getDb()
      .update(readings)
      .set({
        rating: input.rating,
        review: clampWrapupText(input.review),
        summary: clampWrapupText(input.takeaway),
      })
      .where(ownReading(userId, readingId))
      .returning(),
  );
}

export async function getReading(id: string): Promise<Reading | null> {
  const userId = await requireUserId();
  const [reading] = await getDb().select().from(readings).where(ownReading(userId, id));
  return reading ?? null;
}

/** All of the book's readings, oldest first (for "1st", "2nd"… numbering). */
export async function listReadings(bookId: string): Promise<Reading[]> {
  const userId = await requireUserId();
  return getDb()
    .select()
    .from(readings)
    .where(ownReadingsOfBook(userId, bookId))
    .orderBy(asc(readings.started_at));
}

/** Returns the book's open reading, creating one if it doesn't exist yet. */
export async function ensureOpenReading(bookId: string): Promise<Reading> {
  const existing = await getOpenReading(bookId);
  if (existing) return existing;

  const userId = await requireUserId();
  await assertOwnBook(userId, bookId);
  return firstOrThrow(
    await getDb()
      .insert(readings)
      .values({ user_id: userId, book_id: bookId, started_at: new Date().toISOString() })
      .returning(),
  );
}

/** Reopens a finished reading (finished_at cleared) and moves the book back to "reading". */
export async function reopenReading(readingId: string, bookId: string): Promise<void> {
  const userId = await requireUserId();
  await getDb().update(readings).set({ finished_at: null }).where(ownReading(userId, readingId));
  await setShelf(bookId, "reading");
}

/**
 * "Продолжить это прочтение": clears finished_at on the book's most recent reading and the
 * pause/drop markers, if any — also used to resume a paused or return a dropped book.
 */
export async function continueLastReading(bookId: string): Promise<void> {
  const reading = await getLatestReading(bookId);

  if (reading) {
    const userId = await requireUserId();
    await getDb()
      .update(readings)
      .set({ finished_at: null, is_dropped: false, stopped_at: null, pause_reason: null, pause_note: null })
      .where(ownReading(userId, reading.id));
  }

  await setShelf(bookId, "reading");
}

const PAUSE_NOTE_MAX = 1000;

function clampPauseNote(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, PAUSE_NOTE_MAX);
}

function requireNoteForOther(reasonCode: PauseReasonCode | null, note: string | null): void {
  if (reasonCode === "other" && !note) {
    throw new Error('A note is required for the "other" reason.');
  }
}

/** Пауза: прочтение остаётся открытым, прогресс и сессии целы — книга уходит на «Отложено». */
export async function pauseReading(
  bookId: string,
  reasonCode: PauseReasonCode | null,
  note: string | null,
): Promise<void> {
  const clampedNote = clampPauseNote(note);
  requireNoteForOther(reasonCode, clampedNote);

  const reading = await ensureOpenReading(bookId);
  const userId = await requireUserId();
  await getDb()
    .update(readings)
    .set({ pause_reason: reasonCode, pause_note: clampedNote, stopped_at: new Date().toISOString() })
    .where(ownReading(userId, reading.id));

  await setShelf(bookId, "paused");
}

/** Отказ: прочтение закрывается датой остановки и помечается брошенным — в «Прочитано» не попадает. */
export async function dropReading(
  bookId: string,
  reasonCode: PauseReasonCode | null,
  note: string | null,
): Promise<void> {
  const clampedNote = clampPauseNote(note);
  requireNoteForOther(reasonCode, clampedNote);

  const reading = await ensureOpenReading(bookId);
  const userId = await requireUserId();
  const now = new Date().toISOString();
  await getDb()
    .update(readings)
    .set({
      finished_at: now,
      is_dropped: true,
      pause_reason: reasonCode,
      pause_note: clampedNote,
      stopped_at: now,
    })
    .where(ownReading(userId, reading.id));

  await setShelf(bookId, "dropped");
}

/** Самое свежее прочтение каждой книги (открытое или закрытое) — для карточек архива в Библиотеке, одним запросом. */
export async function getLatestReadingByBook(bookIds: string[]): Promise<Map<string, Reading>> {
  if (bookIds.length === 0) return new Map();
  const userId = await requireUserId();
  const rows = await getDb()
    .select()
    .from(readings)
    .where(and(eq(readings.user_id, userId), inArray(readings.book_id, bookIds)))
    .orderBy(desc(readings.started_at));

  const byBookId = new Map<string, Reading>();
  for (const reading of rows) {
    if (!byBookId.has(reading.book_id)) byBookId.set(reading.book_id, reading);
  }
  return byBookId;
}
