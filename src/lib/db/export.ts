import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrls } from "./photos";
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
  const supabase = await createClient();
  const [booksRes, readingsRes, sessionsRes, notesRes, goalsRes, settingsRes] = await Promise.all([
    supabase.from("books").select("*").order("created_at", { ascending: true }),
    supabase.from("readings").select("*").order("created_at", { ascending: true }),
    supabase.from("sessions").select("*").order("started_at", { ascending: true }),
    supabase.from("notes").select("*").order("created_at", { ascending: true }),
    supabase.from("goals").select("*").order("created_at", { ascending: true }),
    supabase.from("settings").select("*").maybeSingle(),
  ]);

  if (booksRes.error) throw booksRes.error;
  if (readingsRes.error) throw readingsRes.error;
  if (sessionsRes.error) throw sessionsRes.error;
  if (notesRes.error) throw notesRes.error;
  if (goalsRes.error) throw goalsRes.error;
  if (settingsRes.error) throw settingsRes.error;

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    books: booksRes.data ?? [],
    readings: readingsRes.data ?? [],
    sessions: sessionsRes.data ?? [],
    notes: notesRes.data ?? [],
    goals: goalsRes.data ?? [],
    settings: settingsRes.data ?? null,
  };
}

export type BookExportRow = { book: Book; reading: Reading | null };

/** Каждая книга со своим последним прочтением (даты, оценка, отзыв, итог, причина) — одна строка на книгу для books.csv. */
export async function getBooksForCsv(): Promise<BookExportRow[]> {
  const supabase = await createClient();
  const { data: books, error } = await supabase.from("books").select("*").order("created_at", { ascending: true });
  if (error) throw error;

  const allBooks = books ?? [];
  const latestByBook = await getLatestReadingByBook(allBooks.map((b) => b.id));
  return allBooks.map((book) => ({ book, reading: latestByBook.get(book.id) ?? null }));
}

export type SessionExportRow = { session: ReadingSession; bookTitle: string };

/** Каждая сессия с названием книги (через reading_id) — одна строка на сессию для sessions.csv. */
export async function getSessionsForCsv(): Promise<SessionExportRow[]> {
  const supabase = await createClient();
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("*")
    .order("started_at", { ascending: true });
  if (error) throw error;

  const allSessions = sessions ?? [];
  if (allSessions.length === 0) return [];

  const readingIds = [...new Set(allSessions.map((s) => s.reading_id))];
  const { data: readings, error: readingsError } = await supabase
    .from("readings")
    .select("id, book_id")
    .in("id", readingIds);
  if (readingsError) throw readingsError;
  const bookIdByReading = new Map((readings ?? []).map((r) => [r.id, r.book_id]));

  const bookIds = [...new Set([...bookIdByReading.values()])];
  const { data: books, error: booksError } = await supabase.from("books").select("id, title").in("id", bookIds);
  if (booksError) throw booksError;
  const titleByBook = new Map((books ?? []).map((b) => [b.id, b.title]));

  return allSessions.map((session) => {
    const bookId = bookIdByReading.get(session.reading_id);
    return { session, bookTitle: (bookId && titleByBook.get(bookId)) || "" };
  });
}

export type NotePhotoRef = { noteId: string; url: string };

/** Подписанные ссылки (1 час) на все фото заметок пользователя — для сборки полного бэкапа в браузере. */
export async function listNotePhotosForExport(): Promise<NotePhotoRef[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notes").select("id, photo_path").not("photo_path", "is", null);
  if (error) throw error;

  const rows = data ?? [];
  const paths = rows.map((row) => row.photo_path as string);
  const urls = await getSignedPhotoUrls(paths);

  const refs: NotePhotoRef[] = [];
  for (const row of rows) {
    const url = urls.get(row.photo_path as string);
    if (url) refs.push({ noteId: row.id, url });
  }
  return refs;
}
