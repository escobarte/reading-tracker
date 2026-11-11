import { createClient } from "@/lib/supabase/server";
import type { PauseReasonCode } from "@/lib/pause-reasons";
import { setShelf } from "./books";
import type { Reading } from "./types";

export async function getOpenReading(bookId: string): Promise<Reading | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("readings")
    .select("*")
    .eq("book_id", bookId)
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** The book's most recent reading, open or finished — the one progress and history are shown for. */
export async function getLatestReading(bookId: string): Promise<Reading | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("readings")
    .select("*")
    .eq("book_id", bookId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Последнее закрытое прочтение книги (не брошенное) — то, для которого показывается экран «Книга прочитана». */
export async function getLatestFinishedReading(bookId: string): Promise<Reading | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("readings")
    .select("*")
    .eq("book_id", bookId)
    .not("finished_at", "is", null)
    .eq("is_dropped", false)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
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

/** Сохраняет оценку, отзыв и итог прочтения; любое поле можно оставить пустым. RLS ограничивает запись своими прочтениями. */
export async function saveReadingWrapup(readingId: string, input: ReadingWrapupInput): Promise<Reading> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("readings")
    .update({
      rating: input.rating,
      review: clampWrapupText(input.review),
      summary: clampWrapupText(input.takeaway),
    })
    .eq("id", readingId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getReading(id: string): Promise<Reading | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("readings").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** All of the book's readings, oldest first (for "1st", "2nd"… numbering). */
export async function listReadings(bookId: string): Promise<Reading[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("readings")
    .select("*")
    .eq("book_id", bookId)
    .order("started_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Returns the book's open reading, creating one if it doesn't exist yet. */
export async function ensureOpenReading(bookId: string): Promise<Reading> {
  const existing = await getOpenReading(bookId);
  if (existing) return existing;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("readings")
    .insert({ book_id: bookId, started_at: new Date().toISOString() })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Reopens a finished reading (finished_at cleared) and moves the book back to "reading". */
export async function reopenReading(readingId: string, bookId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("readings").update({ finished_at: null }).eq("id", readingId);
  if (error) throw error;
  await setShelf(bookId, "reading");
}

/**
 * "Продолжить это прочтение": clears finished_at on the book's most recent reading and the
 * pause/drop markers, if any — also used to resume a paused or return a dropped book.
 */
export async function continueLastReading(bookId: string): Promise<void> {
  const supabase = await createClient();
  const { data: reading, error } = await supabase
    .from("readings")
    .select("id")
    .eq("book_id", bookId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  if (reading) {
    const { error: updateError } = await supabase
      .from("readings")
      .update({ finished_at: null, is_dropped: false, stopped_at: null, pause_reason: null, pause_note: null })
      .eq("id", reading.id);
    if (updateError) throw updateError;
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
  const supabase = await createClient();
  const { error } = await supabase
    .from("readings")
    .update({ pause_reason: reasonCode, pause_note: clampedNote, stopped_at: new Date().toISOString() })
    .eq("id", reading.id);
  if (error) throw error;

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
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("readings")
    .update({
      finished_at: now,
      is_dropped: true,
      pause_reason: reasonCode,
      pause_note: clampedNote,
      stopped_at: now,
    })
    .eq("id", reading.id);
  if (error) throw error;

  await setShelf(bookId, "dropped");
}

/** Самое свежее прочтение каждой книги (открытое или закрытое) — для карточек архива в Библиотеке, одним запросом. */
export async function getLatestReadingByBook(bookIds: string[]): Promise<Map<string, Reading>> {
  if (bookIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("readings")
    .select("*")
    .in("book_id", bookIds)
    .order("started_at", { ascending: false });
  if (error) throw error;

  const byBookId = new Map<string, Reading>();
  for (const reading of data ?? []) {
    if (!byBookId.has(reading.book_id)) byBookId.set(reading.book_id, reading);
  }
  return byBookId;
}
