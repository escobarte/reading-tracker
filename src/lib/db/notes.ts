import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { groupGenres } from "@/lib/stats";
import { pickQuoteOfDay } from "@/lib/notes";
import { localDateKey } from "@/lib/time";
import type { BookShelf, Note, NoteType } from "./types";

export type NoteWithBook = Note & { bookTitle: string; bookAuthor: string | null };

export type NoteFilters = {
  type: NoteType | null;
  favorite: boolean;
  bookId: string | null;
  query: string;
};

export type NoteInput = {
  book_id: string;
  type: NoteType;
  body: string;
  meaning: string | null;
  page: number | null;
  tags: string[];
};

async function attachBooks(notes: Note[]): Promise<NoteWithBook[]> {
  if (notes.length === 0) return [];
  const supabase = await createClient();
  const bookIds = [...new Set(notes.map((n) => n.book_id))];
  const { data: books, error } = await supabase.from("books").select("id, title, author").in("id", bookIds);
  if (error) throw error;
  const byId = new Map((books ?? []).map((b) => [b.id, b]));
  return notes.map((note) => ({
    ...note,
    bookTitle: byId.get(note.book_id)?.title ?? "",
    bookAuthor: byId.get(note.book_id)?.author ?? null,
  }));
}

/** Все заметки по фильтрам колонок (тип, избранное, книга), поиск по тексту — в памяти, без пагинации. */
async function fetchFilteredNotes(filters: NoteFilters): Promise<NoteWithBook[]> {
  const supabase = await createClient();
  let builder = supabase.from("notes").select("*").order("created_at", { ascending: false });
  if (filters.type) builder = builder.eq("type", filters.type);
  if (filters.favorite) builder = builder.eq("is_favorite", true);
  if (filters.bookId) builder = builder.eq("book_id", filters.bookId);
  const { data, error } = await builder;
  if (error) throw error;

  const withBooks = await attachBooks(data ?? []);
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

export async function createNote(input: NoteInput): Promise<Note> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .insert({
      book_id: input.book_id,
      type: input.type,
      body: input.body,
      meaning: input.meaning,
      page: input.page,
      tags: input.tags,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateNote(id: string, input: NoteInput): Promise<Note> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .update({
      book_id: input.book_id,
      type: input.type,
      body: input.body,
      meaning: input.meaning,
      page: input.page,
      tags: input.tags,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteNote(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}

export async function setNoteFavorite(id: string, favorite: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").update({ is_favorite: favorite }).eq("id", id);
  if (error) throw error;
}

/** Уникальные теги по частоте использования, самое частое написание — для подсказок в форме заметки. */
export async function getTagSuggestions(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notes").select("tags");
  if (error) throw error;
  const allTags = (data ?? []).flatMap((row) => row.tags ?? []);
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
  const supabase = await createClient();
  const { data: books, error: booksError } = await supabase
    .from("books")
    .select("id, title, author, shelf")
    .in("shelf", ["reading", "done"])
    .order("title", { ascending: true });
  if (booksError) throw booksError;
  if (!books || books.length === 0) return [];

  const bookIds = books.map((b) => b.id);
  const { data: readings, error: readingsError } = await supabase
    .from("readings")
    .select("id, book_id")
    .in("book_id", bookIds);
  if (readingsError) throw readingsError;

  const readingToBook = new Map((readings ?? []).map((r) => [r.id, r.book_id]));
  const readingIds = (readings ?? []).map((r) => r.id);
  const currentPageByBook = new Map<string, number>();
  if (readingIds.length > 0) {
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select("reading_id, page_to")
      .in("reading_id", readingIds);
    if (sessionsError) throw sessionsError;
    for (const session of sessions ?? []) {
      if (session.page_to == null) continue;
      const bookId = readingToBook.get(session.reading_id);
      if (!bookId) continue;
      const prev = currentPageByBook.get(bookId) ?? 0;
      if (session.page_to > prev) currentPageByBook.set(bookId, session.page_to);
    }
  }

  return books.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    shelf: book.shelf,
    currentPage: currentPageByBook.get(book.id) ?? 0,
  }));
}

/** book_id открытого прочтения, начатого позже всех остальных — книга «по умолчанию» для новой заметки. */
export async function getLatestReadingBookId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("readings")
    .select("book_id")
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.book_id ?? null;
}

export async function getNotesCountForBook(bookId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notes")
    .select("id", { count: "exact", head: true })
    .eq("book_id", bookId);
  if (error) throw error;
  return count ?? 0;
}

export async function listRecentNotesForBook(bookId: string, limit: number): Promise<Note[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("book_id", bookId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** cache(): главная читает цитату дня один раз за запрос. */
export const getQuoteOfDay = cache(async (): Promise<NoteWithBook | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notes").select("*").eq("type", "quote");
  if (error) throw error;

  const quotes = (data ?? []).filter((note) => (note.body ?? "").trim().length > 0);
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
