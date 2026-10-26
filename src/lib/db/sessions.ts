import { createClient } from "@/lib/supabase/server";
import { computeStreak, localDateKey, localDayRangeUtc } from "@/lib/time";
import { setShelf } from "./books";
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

export async function createSession(input: CreateSessionInput): Promise<ReadingSession> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      reading_id: input.reading_id,
      started_at: input.started_at,
      ended_at: input.ended_at,
      page_from: input.page_from,
      page_to: input.page_to,
      pages_read: input.page_to - input.page_from,
      seconds: input.seconds,
      source: input.source,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listRecentSessions(readingId: string, limit = 5): Promise<ReadingSession[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("reading_id", readingId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** All sessions of a reading, newest first — for the "all history" screen. */
export async function listAllSessions(readingId: string): Promise<ReadingSession[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("reading_id", readingId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSession(id: string): Promise<ReadingSession | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export type UpdateSessionInput = {
  started_at: string;
  ended_at: string;
  page_from: number;
  page_to: number;
  seconds: number;
};

export async function updateSession(id: string, input: UpdateSessionInput): Promise<ReadingSession> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .update({
      started_at: input.started_at,
      ended_at: input.ended_at,
      page_from: input.page_from,
      page_to: input.page_to,
      pages_read: input.page_to - input.page_from,
      seconds: input.seconds,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSession(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw error;
}

/** page_to of the latest session of the book's open reading, or 0 if there is none. */
export async function getCurrentPage(bookId: string): Promise<number> {
  const supabase = await createClient();
  const { data: reading, error: readingError } = await supabase
    .from("readings")
    .select("id")
    .eq("book_id", bookId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readingError) throw readingError;
  if (!reading) return 0;

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("page_to")
    .eq("reading_id", reading.id)
    .order("page_to", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (sessionError) throw sessionError;
  return session?.page_to ?? 0;
}

export type SyncResult = { justFinished: boolean; needsRevertConfirm: boolean };

/**
 * Keeps the reading's finished state consistent with the sessions that back it:
 * closes the reading when a session reaches the last page, and flags for confirmation
 * when an edit or delete leaves a finished reading short of the last page.
 */
export async function syncReadingCompletion(bookId: string, readingId: string): Promise<SyncResult> {
  const supabase = await createClient();
  const [{ data: book, error: bookError }, { data: reading, error: readingError }] = await Promise.all([
    supabase.from("books").select("total_pages").eq("id", bookId).single(),
    supabase.from("readings").select("finished_at").eq("id", readingId).single(),
  ]);
  if (bookError) throw bookError;
  if (readingError) throw readingError;

  if (!book.total_pages) return { justFinished: false, needsRevertConfirm: false };

  const { data: maxRow, error: maxError } = await supabase
    .from("sessions")
    .select("page_to, ended_at, started_at")
    .eq("reading_id", readingId)
    .order("page_to", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (maxError) throw maxError;

  const maxPageTo = maxRow?.page_to ?? 0;
  const reachedEnd = maxPageTo >= book.total_pages;

  if (reachedEnd && !reading.finished_at) {
    const finishedAt = maxRow?.ended_at ?? maxRow?.started_at ?? new Date().toISOString();
    const { error: finishError } = await supabase
      .from("readings")
      .update({ finished_at: finishedAt })
      .eq("id", readingId);
    if (finishError) throw finishError;
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("seconds, pages_read")
    .eq("reading_id", readingId);
  if (error) throw error;

  const sessions = data ?? [];
  const totalSeconds = sessions.reduce((sum, s) => sum + (s.seconds ?? 0), 0);
  const totalPages = sessions.reduce((sum, s) => sum + (s.pages_read ?? 0), 0);
  const sessionCount = sessions.length;
  const totalMinutes = Math.round(totalSeconds / 60);

  return {
    totalMinutes,
    sessionCount,
    pagesPerHour: totalSeconds > 0 ? Math.round((totalPages / totalSeconds) * 3600) : null,
    avgSessionMinutes: sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : null,
  };
}

export type TodaySummary = { pages: number; minutes: number; sessionCount: number };

export async function getTodaySummary(): Promise<TodaySummary> {
  const supabase = await createClient();
  const { start, end } = localDayRangeUtc();
  const { data, error } = await supabase
    .from("sessions")
    .select("pages_read, seconds")
    .gte("started_at", start.toISOString())
    .lt("started_at", end.toISOString());
  if (error) throw error;

  const sessions = data ?? [];
  const pages = sessions.reduce((sum, s) => sum + (s.pages_read ?? 0), 0);
  const seconds = sessions.reduce((sum, s) => sum + (s.seconds ?? 0), 0);
  return { pages, minutes: Math.round(seconds / 60), sessionCount: sessions.length };
}

export async function getStreakDays(): Promise<number> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 400 * 86400000).toISOString();
  const { data, error } = await supabase.from("sessions").select("started_at").gte("started_at", since);
  if (error) throw error;

  const keys = new Set((data ?? []).map((s) => localDateKey(s.started_at)));
  return computeStreak(keys);
}
