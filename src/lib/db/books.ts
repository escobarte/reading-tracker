import { createClient } from "@/lib/supabase/server";
import type { Book, BookFormat, BookShelf } from "./types";

export type BookInput = {
  title: string;
  author?: string | null;
  cover_url?: string | null;
  total_pages?: number | null;
  format?: BookFormat;
  shelf?: BookShelf;
  series?: string | null;
  series_number?: number | null;
  genre?: string | null;
  tags?: string[];
  google_books_id?: string | null;
  isbn?: string | null;
  language?: string | null;
};

export async function listBooks(): Promise<Book[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .order("queue_position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getBook(id: string): Promise<Book | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("books").select("*").eq("id", id).maybeSingle();

  if (error) throw error;
  return data;
}

export async function findDuplicateBook(input: {
  google_books_id?: string | null;
  title: string;
  author?: string | null;
}): Promise<Book | null> {
  const supabase = await createClient();

  if (input.google_books_id) {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("google_books_id", input.google_books_id)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  const { data: candidates, error } = await supabase
    .from("books")
    .select("*")
    .ilike("title", input.title.trim());
  if (error) throw error;

  const author = (input.author ?? "").trim().toLowerCase();
  const match = (candidates ?? []).find(
    (book) => (book.author ?? "").trim().toLowerCase() === author,
  );
  return match ?? null;
}

async function nextQueuePosition(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<number> {
  const { data, error } = await supabase
    .from("books")
    .select("queue_position")
    .eq("shelf", "want")
    .order("queue_position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.queue_position ?? 0) + 1;
}

async function renumberQueue(supabase: Awaited<ReturnType<typeof createClient>>): Promise<void> {
  const { data, error } = await supabase
    .from("books")
    .select("id, queue_position")
    .eq("shelf", "want")
    .order("queue_position", { ascending: true, nullsFirst: false });
  if (error) throw error;

  const updates = (data ?? [])
    .map((book, index) => ({ id: book.id, position: index + 1, changed: book.queue_position !== index + 1 }))
    .filter((entry) => entry.changed);

  await Promise.all(
    updates.map((entry) =>
      supabase.from("books").update({ queue_position: entry.position }).eq("id", entry.id),
    ),
  );
}

export async function createBook(input: BookInput): Promise<Book> {
  const supabase = await createClient();
  const shelf = input.shelf ?? "want";

  const queue_position = shelf === "want" ? await nextQueuePosition(supabase) : null;

  const { data, error } = await supabase
    .from("books")
    .insert({
      title: input.title.trim(),
      author: input.author?.trim() || null,
      cover_url: input.cover_url || null,
      total_pages: input.total_pages ?? null,
      format: input.format ?? "paper",
      shelf,
      queue_position,
      series: input.series || null,
      series_number: input.series_number ?? null,
      genre: input.genre || null,
      tags: input.tags ?? [],
      google_books_id: input.google_books_id || null,
      isbn: input.isbn || null,
      language: input.language || null,
    })
    .select("*")
    .single();
  if (error) throw error;

  if (shelf === "reading") {
    const { error: readingError } = await supabase
      .from("readings")
      .insert({ book_id: data.id, started_at: new Date().toISOString() });
    if (readingError) throw readingError;
  }

  return data;
}

export async function updateBook(id: string, input: Partial<BookInput>): Promise<Book> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};

  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.author !== undefined) patch.author = input.author?.trim() || null;
  if (input.cover_url !== undefined) patch.cover_url = input.cover_url || null;
  if (input.total_pages !== undefined) patch.total_pages = input.total_pages;
  if (input.format !== undefined) patch.format = input.format;
  if (input.series !== undefined) patch.series = input.series || null;
  if (input.series_number !== undefined) patch.series_number = input.series_number;
  if (input.genre !== undefined) patch.genre = input.genre || null;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.isbn !== undefined) patch.isbn = input.isbn || null;
  if (input.language !== undefined) patch.language = input.language || null;

  const { data, error } = await supabase
    .from("books")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBook(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) throw error;
  await renumberQueue(supabase);
}

export async function reorderQueue(orderedIds: string[]): Promise<void> {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("books").update({ queue_position: index + 1 }).eq("id", id),
    ),
  );
}

/** Sets the shelf directly, without touching readings. Used where reading state is managed separately. */
export async function setShelf(id: string, shelf: BookShelf): Promise<void> {
  const supabase = await createClient();
  const queue_position = shelf === "want" ? await nextQueuePosition(supabase) : null;
  const { error } = await supabase.from("books").update({ shelf, queue_position }).eq("id", id);
  if (error) throw error;
  if (shelf !== "want") await renumberQueue(supabase);
}

export async function moveShelf(id: string, shelf: BookShelf): Promise<void> {
  const supabase = await createClient();

  if (shelf === "want") {
    const queue_position = await nextQueuePosition(supabase);
    const { error } = await supabase
      .from("books")
      .update({ shelf, queue_position })
      .eq("id", id);
    if (error) throw error;
    return;
  }

  if (shelf === "reading") {
    const { data: openReading, error: findError } = await supabase
      .from("readings")
      .select("id")
      .eq("book_id", id)
      .is("finished_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (findError) throw findError;

    if (!openReading) {
      const { error: insertError } = await supabase
        .from("readings")
        .insert({ book_id: id, started_at: new Date().toISOString() });
      if (insertError) throw insertError;
    }

    const { error } = await supabase
      .from("books")
      .update({ shelf, queue_position: null })
      .eq("id", id);
    if (error) throw error;
    await renumberQueue(supabase);
    return;
  }

  if (shelf === "done") {
    const { data: openReading, error: findError } = await supabase
      .from("readings")
      .select("id")
      .eq("book_id", id)
      .is("finished_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (findError) throw findError;

    const now = new Date().toISOString();
    if (openReading) {
      const { error: finishError } = await supabase
        .from("readings")
        .update({ finished_at: now })
        .eq("id", openReading.id);
      if (finishError) throw finishError;
    } else {
      const { error: insertError } = await supabase
        .from("readings")
        .insert({ book_id: id, started_at: now, finished_at: now });
      if (insertError) throw insertError;
    }

    const { error } = await supabase
      .from("books")
      .update({ shelf, queue_position: null })
      .eq("id", id);
    if (error) throw error;
    await renumberQueue(supabase);
    return;
  }

  // paused
  const { error } = await supabase.from("books").update({ shelf, queue_position: null }).eq("id", id);
  if (error) throw error;
  await renumberQueue(supabase);
}
