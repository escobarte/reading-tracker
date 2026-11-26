import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { books, notes, readings, sessions } from "@/db/schema";
import { groupGenres } from "@/lib/stats";
import { NO_BOOK_ID, pickQuoteOfDay } from "@/lib/notes";
import { requireUserId } from "@/lib/require-user";
import { localDateKey } from "@/lib/time";
import { deleteNotePhoto, getSignedPhotoUrls, notePhotoPath, uploadNotePhoto } from "./photos";
import { assertOwnBook, assertOwnNote, firstOrThrow } from "./query";
import type { BookShelf, Note, NoteType } from "./types";

export type NoteWithBook = Note & { bookTitle: string; bookAuthor: string | null; photoUrl: string | null };
export type NoteWithPhoto = Note & { photoUrl: string | null };

/** Заметка по id, только своя. */
function ownNote(userId: string, id: string) {
  return and(eq(notes.id, id), eq(notes.user_id, userId));
}

/** В базе `type` допускает NULL, но приложение всегда его заполняет. */
function toNote(row: typeof notes.$inferSelect): Note {
  return row as Note;
}

async function attachPhotoUrls<T extends { photo_path: string | null }>(
  notes: T[],
): Promise<(T & { photoUrl: string | null })[]> {
  const paths = notes.map((n) => n.photo_path).filter((p): p is string => Boolean(p));
  const urls = await getSignedPhotoUrls(paths);
  return notes.map((note) => ({ ...note, photoUrl: note.photo_path ? (urls.get(note.photo_path) ?? null) : null }));
}

export type NoteFilters = {
  type: NoteType | null;
  favorite: boolean;
  bookId: string | null;
  query: string;
};

export type NoteInput = {
  book_id: string | null;
  type: NoteType;
  body: string;
  meaning: string | null;
  page: number | null;
  tags: string[];
};

async function attachBooks(rows: Note[]): Promise<NoteWithBook[]> {
  if (rows.length === 0) return [];
  const userId = await requireUserId();
  const bookIds = [...new Set(rows.map((n) => n.book_id).filter((id): id is string => id !== null))];

  const withPhotosPromise = attachPhotoUrls(rows);
  const noteBooks =
    bookIds.length > 0
      ? await getDb()
          .select({ id: books.id, title: books.title, author: books.author })
          .from(books)
          .where(and(eq(books.user_id, userId), inArray(books.id, bookIds)))
      : [];
  const withPhotos = await withPhotosPromise;

  const byId = new Map(noteBooks.map((b) => [b.id, b]));
  return withPhotos.map((note) => ({
    ...note,
    bookTitle: (note.book_id ? byId.get(note.book_id)?.title : undefined) ?? "",
    bookAuthor: (note.book_id ? byId.get(note.book_id)?.author : undefined) ?? null,
  }));
}

/** Все заметки по фильтрам колонок (тип, избранное, книга), поиск по тексту — в памяти, без пагинации. */
async function fetchFilteredNotes(filters: NoteFilters): Promise<NoteWithBook[]> {
  const userId = await requireUserId();
  const bookFilter =
    filters.bookId === NO_BOOK_ID
      ? isNull(notes.book_id)
      : filters.bookId
        ? eq(notes.book_id, filters.bookId)
        : undefined;
  // and() пропускает undefined: незаданный фильтр не добавляет условия.
  const rows = await getDb()
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.user_id, userId),
        filters.type ? eq(notes.type, filters.type) : undefined,
        filters.favorite ? eq(notes.is_favorite, true) : undefined,
        bookFilter,
      ),
    )
    .orderBy(desc(notes.created_at));

  const withBooks = await attachBooks(rows.map(toNote));
  const q = filters.query.trim().toLowerCase();
  if (!q) return withBooks;

  return withBooks.filter(
    (note) =>
      (note.body ?? "").toLowerCase().includes(q) ||
      (note.meaning ?? "").toLowerCase().includes(q) ||
      note.bookTitle.toLowerCase().includes(q) ||
      note.tags.some((tag) => tag.toLowerCase().includes(q)),
  );
}

export async function listNotesPage(
  filters: NoteFilters,
  limit: number,
): Promise<{ notes: NoteWithBook[]; hasMore: boolean }> {
  const all = await fetchFilteredNotes(filters);
  return { notes: all.slice(0, limit), hasMore: all.length > limit };
}

export async function listNotesForExport(filters: NoteFilters): Promise<NoteWithBook[]> {
  return fetchFilteredNotes(filters);
}

/** Вставляет свою заметку; книга, если указана, тоже должна быть своей. */
async function insertNote(input: Omit<NoteInput, "body"> & { body: string | null }): Promise<Note> {
  const userId = await requireUserId();
  const db = getDb();
  if (input.book_id) await assertOwnBook(db, userId, input.book_id);
  return toNote(
    firstOrThrow(
      await db
        .insert(notes)
        .values({
          user_id: userId,
          book_id: input.book_id,
          type: input.type,
          body: input.body,
          meaning: input.meaning,
          page: input.page,
          tags: input.tags,
        })
        .returning(),
    ),
  );
}

export async function createNote(input: NoteInput): Promise<Note> {
  return insertNote(input);
}

export async function updateNote(id: string, input: NoteInput): Promise<Note> {
  const userId = await requireUserId();
  const db = getDb();
  if (input.book_id) await assertOwnBook(db, userId, input.book_id);
  return toNote(
    firstOrThrow(
      await db
        .update(notes)
        .set({
          book_id: input.book_id,
          type: input.type,
          body: input.body,
          meaning: input.meaning,
          page: input.page,
          tags: input.tags,
        })
        .where(ownNote(userId, id))
        .returning(),
    ),
  );
}

export async function deleteNote(id: string): Promise<void> {
  const userId = await requireUserId();
  const [deleted] = await getDb()
    .delete(notes)
    .where(ownNote(userId, id))
    .returning({ photo_path: notes.photo_path });

  if (deleted?.photo_path) await deleteNotePhoto(deleted.photo_path);
}

async function setPhotoPath(noteId: string, path: string | null): Promise<Note> {
  const userId = await requireUserId();
  return toNote(
    firstOrThrow(
      await getDb().update(notes).set({ photo_path: path }).where(ownNote(userId, noteId)).returning(),
    ),
  );
}

/** Загружает фото только что созданной заметки; если не вышло, заметка удаляется. */
async function attachNewPhoto(noteId: string, userId: string, photoBytes: Uint8Array): Promise<Note> {
  const path = notePhotoPath(userId, noteId);
  try {
    await uploadNotePhoto(path, photoBytes);
  } catch (uploadError) {
    await deleteNote(noteId);
    throw uploadError;
  }
  return setPhotoPath(noteId, path);
}

/** Создаёт заметку типа `photo` без текста («Сохранить как фото») и сразу загружает фото в Storage. */
export async function createPhotoNote(input: {
  userId: string;
  book_id: string;
  page: number | null;
  photoBytes: Uint8Array;
}): Promise<Note> {
  const note = await insertNote({
    book_id: input.book_id,
    type: "photo",
    body: null,
    meaning: null,
    page: input.page,
    tags: [],
  });
  return attachNewPhoto(note.id, input.userId, input.photoBytes);
}

/** Создаёт текстовую заметку (цитата/мысль/слово) с прикреплённым фото страницы (результат распознавания). */
export async function createNoteWithPhoto(input: {
  userId: string;
  book_id: string;
  type: NoteType;
  body: string;
  page: number | null;
  photoBytes: Uint8Array;
}): Promise<Note> {
  const body = input.body.trim();
  const type: NoteType = body ? input.type : "photo";

  const note = await insertNote({
    book_id: input.book_id,
    type,
    body: body || null,
    meaning: null,
    page: input.page,
    tags: [],
  });
  return attachNewPhoto(note.id, input.userId, input.photoBytes);
}

/** «Заменить» в правке заметки: перезаписывает объект в Storage по тому же пути. */
export async function replaceNotePhoto(userId: string, noteId: string, photoBytes: Uint8Array): Promise<string> {
  // Владелец проверяется до загрузки, чтобы для чужой или удалённой заметки не появлялся файл.
  await assertOwnNote(getDb(), await requireUserId(), noteId);
  const path = notePhotoPath(userId, noteId);
  await uploadNotePhoto(path, photoBytes);
  await setPhotoPath(noteId, path);
  return path;
}

/** Путь фото своей заметки или `null`. */
async function findPhotoPath(noteId: string): Promise<string | null> {
  const userId = await requireUserId();
  const [note] = await getDb()
    .select({ photo_path: notes.photo_path })
    .from(notes)
    .where(ownNote(userId, noteId));
  return note?.photo_path ?? null;
}

/** «Удалить фото» в правке заметки: убирает файл из Storage и ссылку в заметке. */
export async function removeNotePhoto(noteId: string): Promise<void> {
  const path = await findPhotoPath(noteId);
  if (!path) return;

  await deleteNotePhoto(path);
  await setPhotoPath(noteId, null);
}

export async function getNotePhotoUrl(noteId: string): Promise<string | null> {
  const path = await findPhotoPath(noteId);
  if (!path) return null;
  const urls = await getSignedPhotoUrls([path]);
  return urls.get(path) ?? null;
}

export async function setNoteFavorite(id: string, favorite: boolean): Promise<void> {
  const userId = await requireUserId();
  await getDb().update(notes).set({ is_favorite: favorite }).where(ownNote(userId, id));
}

/** Уникальные теги по частоте использования, самое частое написание — для подсказок в форме заметки. */
export async function getTagSuggestions(): Promise<string[]> {
  const userId = await requireUserId();
  const rows = await getDb().select({ tags: notes.tags }).from(notes).where(eq(notes.user_id, userId));
  const allTags = rows.flatMap((row) => row.tags);
  return groupGenres(allTags).groups.map((g) => g.label);
}

export type NoteBookOption = {
  id: string;
  title: string;
  author: string | null;
  shelf: BookShelf;
  currentPage: number;
};

/** Книги «Читаю» и «Прочитано» с текущей страницей — список для выбора книги в форме заметки. */
export async function getBookPickerOptions(): Promise<NoteBookOption[]> {
  const userId = await requireUserId();
  const db = getDb();
  const pickerBooks = await db
    .select({ id: books.id, title: books.title, author: books.author, shelf: books.shelf })
    .from(books)
    .where(and(eq(books.user_id, userId), inArray(books.shelf, ["reading", "done"])))
    .orderBy(asc(books.title));
  if (pickerBooks.length === 0) return [];

  const bookIds = pickerBooks.map((b) => b.id);
  const bookReadings = await db
    .select({ id: readings.id, book_id: readings.book_id })
    .from(readings)
    .where(and(eq(readings.user_id, userId), inArray(readings.book_id, bookIds)));

  const readingToBook = new Map(bookReadings.map((r) => [r.id, r.book_id]));
  const readingIds = bookReadings.map((r) => r.id);
  const currentPageByBook = new Map<string, number>();
  if (readingIds.length > 0) {
    const pageRows = await db
      .select({ reading_id: sessions.reading_id, page_to: sessions.page_to })
      .from(sessions)
      .where(and(eq(sessions.user_id, userId), inArray(sessions.reading_id, readingIds)));
    for (const session of pageRows) {
      if (session.page_to == null) continue;
      const bookId = readingToBook.get(session.reading_id);
      if (!bookId) continue;
      const prev = currentPageByBook.get(bookId) ?? 0;
      if (session.page_to > prev) currentPageByBook.set(bookId, session.page_to);
    }
  }

  return pickerBooks.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    shelf: book.shelf,
    currentPage: currentPageByBook.get(book.id) ?? 0,
  }));
}

/** book_id открытого прочтения, начатого позже всех остальных — книга «по умолчанию» для новой заметки. */
export async function getLatestReadingBookId(): Promise<string | null> {
  const userId = await requireUserId();
  const [reading] = await getDb()
    .select({ book_id: readings.book_id })
    .from(readings)
    .where(and(eq(readings.user_id, userId), isNull(readings.finished_at)))
    .orderBy(desc(readings.started_at))
    .limit(1);
  return reading?.book_id ?? null;
}

/** Заметки книги, только свои. */
function ownNotesOfBook(userId: string, bookId: string) {
  return and(eq(notes.user_id, userId), eq(notes.book_id, bookId));
}

export async function getNotesCountForBook(bookId: string): Promise<number> {
  const userId = await requireUserId();
  const [row] = await getDb().select({ value: count() }).from(notes).where(ownNotesOfBook(userId, bookId));
  return row?.value ?? 0;
}

export async function listRecentNotesForBook(bookId: string, limit: number): Promise<NoteWithPhoto[]> {
  const userId = await requireUserId();
  const rows = await getDb()
    .select()
    .from(notes)
    .where(ownNotesOfBook(userId, bookId))
    .orderBy(desc(notes.created_at))
    .limit(limit);
  return attachPhotoUrls(rows.map(toNote));
}

/** cache(): главная читает цитату дня один раз за запрос. */
export const getQuoteOfDay = cache(async (): Promise<NoteWithBook | null> => {
  const userId = await requireUserId();
  const rows = await getDb()
    .select()
    .from(notes)
    .where(and(eq(notes.user_id, userId), eq(notes.type, "quote")));

  const quotes = rows.map(toNote).filter((note) => (note.body ?? "").trim().length > 0);
  if (quotes.length === 0) return null;

  const sorted = [...quotes].sort((a, b) => a.id.localeCompare(b.id));
  const picked = pickQuoteOfDay(
    sorted.map((q) => ({ id: q.id, isFavorite: q.is_favorite })),
    localDateKey(new Date()),
  );
  const note = sorted.find((q) => q.id === picked?.id) ?? null;
  if (!note) return null;

  const [withBook] = await attachBooks([note]);
  return withBook;
});
