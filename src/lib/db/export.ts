import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { books, goals, notes, readings, sessions, settings } from "@/db/schema";
import { requireUserId } from "@/lib/require-user";
import { notePhotoUrl } from "./photos";
import { getLatestReadingByBook } from "./readings";
import type { Book, Goal, Note, Reading, ReadingSession, UserSettings } from "./types";

export type FullExportData = {
  version: 1;
  exported_at: string;
  books: Book[];
  readings: Reading[];
  sessions: ReadingSession[];
  notes: Note[];
  goals: Goal[];
  settings: UserSettings | null;
};

/** Полный снимок данных пользователя для /api/export/json. Без ocr_usage и без подписанных ссылок на фото. */
export async function getFullExportData(): Promise<FullExportData> {
  const userId = await requireUserId();
  const db = getDb();
  const [allBooks, allReadings, allSessions, allNotes, allGoals, [userSettings]] = await Promise.all([
    db.select().from(books).where(eq(books.user_id, userId)).orderBy(asc(books.created_at)),
    db.select().from(readings).where(eq(readings.user_id, userId)).orderBy(asc(readings.created_at)),
    db.select().from(sessions).where(eq(sessions.user_id, userId)).orderBy(asc(sessions.started_at)),
    db.select().from(notes).where(eq(notes.user_id, userId)).orderBy(asc(notes.created_at)),
    db.select().from(goals).where(eq(goals.user_id, userId)).orderBy(asc(goals.created_at)),
    db.select().from(settings).where(eq(settings.user_id, userId)),
  ]);

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    books: allBooks,
    readings: allReadings,
    sessions: allSessions,
    // type и kind в базе допускают NULL, но приложение всегда их заполняет.
    notes: allNotes as Note[],
    goals: allGoals as Goal[],
    settings: userSettings ?? null,
  };
}

export type BookExportRow = { book: Book; reading: Reading | null };

/** Каждая книга со своим последним прочтением (даты, оценка, отзыв, итог, причина) — одна строка на книгу для books.csv. */
export async function getBooksForCsv(): Promise<BookExportRow[]> {
  const userId = await requireUserId();
  const allBooks = await getDb()
    .select()
    .from(books)
    .where(eq(books.user_id, userId))
    .orderBy(asc(books.created_at));

  const latestByBook = await getLatestReadingByBook(allBooks.map((b) => b.id));
  return allBooks.map((book) => ({ book, reading: latestByBook.get(book.id) ?? null }));
}

export type SessionExportRow = { session: ReadingSession; bookTitle: string };

/** Каждая сессия с названием книги (через reading_id) — одна строка на сессию для sessions.csv. */
export async function getSessionsForCsv(): Promise<SessionExportRow[]> {
  const userId = await requireUserId();
  const db = getDb();
  const allSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.user_id, userId))
    .orderBy(asc(sessions.started_at));
  if (allSessions.length === 0) return [];

  const readingIds = [...new Set(allSessions.map((s) => s.reading_id))];
  const sessionReadings = await db
    .select({ id: readings.id, book_id: readings.book_id })
    .from(readings)
    .where(and(eq(readings.user_id, userId), inArray(readings.id, readingIds)));
  const bookIdByReading = new Map(sessionReadings.map((r) => [r.id, r.book_id]));

  const bookIds = [...new Set([...bookIdByReading.values()])];
  const sessionBooks = await db
    .select({ id: books.id, title: books.title })
    .from(books)
    .where(and(eq(books.user_id, userId), inArray(books.id, bookIds)));
  const titleByBook = new Map(sessionBooks.map((b) => [b.id, b.title]));

  return allSessions.map((session) => {
    const bookId = bookIdByReading.get(session.reading_id);
    return { session, bookTitle: (bookId && titleByBook.get(bookId)) || "" };
  });
}

export type NotePhotoRef = { noteId: string; url: string };

/**
 * Адреса всех фото заметок пользователя — для сборки полного бэкапа в браузере.
 * Если файла нет на диске, адрес ответит 404, и бэкап назовёт заметку среди пропущенных.
 */
export async function listNotePhotosForExport(): Promise<NotePhotoRef[]> {
  const userId = await requireUserId();
  const rows = await getDb()
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.user_id, userId), isNotNull(notes.photo_path)));

  return rows.map((row) => ({ noteId: row.id, url: notePhotoUrl(row.id) }));
}
