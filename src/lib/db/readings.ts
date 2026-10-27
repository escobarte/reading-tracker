import { createClient } from "@/lib/supabase/server";
import { localYear } from "@/lib/time";
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

/** Число прочтений, закрытых в текущем календарном году (Europe/Bucharest) — для годовой цели. */
export async function getFinishedThisYearCount(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("readings").select("finished_at").not("finished_at", "is", null);
  if (error) throw error;

  const currentYear = localYear(new Date());
  return (data ?? []).filter(
    (reading) => reading.finished_at && localYear(reading.finished_at) === currentYear,
  ).length;
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

/** "Продолжить это прочтение": clears finished_at on the book's most recent reading. */
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
      .update({ finished_at: null })
      .eq("id", reading.id);
    if (updateError) throw updateError;
  }

  await setShelf(bookId, "reading");
}
