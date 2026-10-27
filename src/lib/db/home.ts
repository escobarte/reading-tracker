import { createClient } from "@/lib/supabase/server";
import { getDailyPagesGoal, getDeadlineForReading, getYearlyBooksGoal } from "@/lib/db/goals";
import type { DeadlineCardData } from "@/lib/db/goals";
import { localDateKey, localWeekRangeUtc, localYear } from "@/lib/time";
import { getFinishedThisYearCount } from "./readings";
import { getStreakDays, getTodaySummary } from "./sessions";
import type { BookFormat } from "./types";

export type HomeReadingBook = {
  id: string;
  readingId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  format: BookFormat;
  totalPages: number | null;
  currentPage: number;
  percent: number;
};

export type HomeDeadline = DeadlineCardData & { bookId: string; bookTitle: string; readingId: string };

export type HomeWeekDay = {
  dateKey: string;
  weekdayIndex: number;
  pages: number;
  isToday: boolean;
  isFuture: boolean;
  noRead: boolean;
};

export type HomeQueueBook = {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  position: number;
};

export type HomeRecentBook = {
  id: string;
  title: string;
  coverUrl: string | null;
};

export type HomeData = {
  reading: HomeReadingBook[];
  today: { pages: number; minutes: number; goal: number };
  streak: number;
  week: { days: HomeWeekDay[]; totalPages: number; totalMinutes: number; goalPages: number };
  queue: HomeQueueBook[];
  year: { finishedCount: number; goal: number };
  recent: HomeRecentBook[];
  deadline: HomeDeadline | null;
};

async function fetchReadingSection(): Promise<HomeReadingBook[]> {
  const supabase = await createClient();
  const { data: books, error: booksError } = await supabase
    .from("books")
    .select("*")
    .eq("shelf", "reading");
  if (booksError) throw booksError;
  if (!books || books.length === 0) return [];

  const bookIds = books.map((b) => b.id);
  const { data: openReadings, error: readingsError } = await supabase
    .from("readings")
    .select("id, book_id, started_at")
    .in("book_id", bookIds)
    .is("finished_at", null);
  if (readingsError) throw readingsError;

  const readingIdToBookId = new Map((openReadings ?? []).map((r) => [r.id, r.book_id]));
  const readingIdByBookId = new Map((openReadings ?? []).map((r) => [r.book_id, r.id]));
  const startedAtByBookId = new Map((openReadings ?? []).map((r) => [r.book_id, r.started_at ?? ""]));
  const readingIds = (openReadings ?? []).map((r) => r.id);

  const currentPageByBookId = new Map<string, number>();
  if (readingIds.length > 0) {
    const { data: sessionRows, error: sessionsError } = await supabase
      .from("sessions")
      .select("reading_id, page_to")
      .in("reading_id", readingIds);
    if (sessionsError) throw sessionsError;
    for (const row of sessionRows ?? []) {
      if (row.page_to == null) continue;
      const bookId = readingIdToBookId.get(row.reading_id);
      if (!bookId) continue;
      const prev = currentPageByBookId.get(bookId) ?? 0;
      if (row.page_to > prev) currentPageByBookId.set(bookId, row.page_to);
    }
  }

  return books
    .slice()
    .sort((a, b) => (startedAtByBookId.get(b.id) ?? "").localeCompare(startedAtByBookId.get(a.id) ?? ""))
    .map((book) => {
      const currentPage = currentPageByBookId.get(book.id) ?? 0;
      const percent = book.total_pages
        ? Math.min(100, Math.round((currentPage / book.total_pages) * 100))
        : 0;
      return {
        id: book.id,
        readingId: readingIdByBookId.get(book.id) ?? "",
        title: book.title,
        author: book.author,
        coverUrl: book.cover_url,
        format: book.format,
        totalPages: book.total_pages,
        currentPage,
        percent,
      };
    });
}

/** Дедлайн первой (по порядку карусели) из читаемых книг, у которой он задан — единственный слот на главной. */
async function fetchDeadlineSection(reading: HomeReadingBook[]): Promise<HomeDeadline | null> {
  for (const book of reading) {
    if (!book.readingId || !book.totalPages) continue;
    const computed = await getDeadlineForReading(book.readingId, book.totalPages);
    if (computed) return { ...computed, bookId: book.id, bookTitle: book.title, readingId: book.readingId };
  }
  return null;
}

async function fetchQueueSection(): Promise<HomeQueueBook[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .select("id, title, author, cover_url, queue_position")
    .eq("shelf", "want")
    .order("queue_position", { ascending: true, nullsFirst: false })
    .limit(6);
  if (error) throw error;
  return (data ?? []).map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.cover_url,
    position: book.queue_position ?? 0,
  }));
}

async function fetchWeekSection(dailyGoal: number): Promise<HomeData["week"]> {
  const supabase = await createClient();
  const todayKey = localDateKey(new Date());
  const { start, end } = localWeekRangeUtc();

  const { data, error } = await supabase
    .from("sessions")
    .select("started_at, pages_read, seconds")
    .gte("started_at", start.toISOString())
    .lt("started_at", end.toISOString());
  if (error) throw error;

  const pagesByDay = new Map<string, number>();
  let totalMinutes = 0;
  for (const session of data ?? []) {
    const key = localDateKey(session.started_at);
    pagesByDay.set(key, (pagesByDay.get(key) ?? 0) + (session.pages_read ?? 0));
    totalMinutes += Math.round((session.seconds ?? 0) / 60);
  }

  const days: HomeWeekDay[] = [];
  for (let weekdayIndex = 0; weekdayIndex < 7; weekdayIndex++) {
    const dateKey = localDateKey(new Date(start.getTime() + weekdayIndex * 86400000));
    const pages = pagesByDay.get(dateKey) ?? 0;
    const isToday = dateKey === todayKey;
    const isFuture = dateKey > todayKey;
    days.push({ dateKey, weekdayIndex, pages, isToday, isFuture, noRead: !isToday && !isFuture && pages === 0 });
  }

  const totalPages = days.reduce((sum, day) => sum + day.pages, 0);
  return { days, totalPages, totalMinutes, goalPages: dailyGoal * 7 };
}

async function fetchYearSection(yearGoal: number): Promise<HomeData["year"]> {
  const finishedCount = await getFinishedThisYearCount();
  return { finishedCount, goal: yearGoal };
}

async function fetchRecentSection(): Promise<HomeRecentBook[]> {
  const supabase = await createClient();
  const { data: readings, error: readingsError } = await supabase
    .from("readings")
    .select("book_id, finished_at")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(30);
  if (readingsError) throw readingsError;

  const orderedBookIds: string[] = [];
  const seen = new Set<string>();
  for (const reading of readings ?? []) {
    if (seen.has(reading.book_id)) continue;
    seen.add(reading.book_id);
    orderedBookIds.push(reading.book_id);
    if (orderedBookIds.length >= 6) break;
  }
  if (orderedBookIds.length === 0) return [];

  const { data: books, error: booksError } = await supabase
    .from("books")
    .select("id, title, cover_url")
    .in("id", orderedBookIds);
  if (booksError) throw booksError;

  const byId = new Map((books ?? []).map((book) => [book.id, book]));
  return orderedBookIds
    .map((id) => byId.get(id))
    .filter((book): book is NonNullable<typeof book> => Boolean(book))
    .map((book) => ({ id: book.id, title: book.title, coverUrl: book.cover_url }));
}

export async function getHomeData(): Promise<HomeData> {
  const [dailyGoal, yearGoal, reading, today, streak, queue, recent] = await Promise.all([
    getDailyPagesGoal(),
    getYearlyBooksGoal(localYear(new Date())),
    fetchReadingSection(),
    getTodaySummary(),
    getStreakDays(),
    fetchQueueSection(),
    fetchRecentSection(),
  ]);

  const [week, year, deadline] = await Promise.all([
    fetchWeekSection(dailyGoal),
    fetchYearSection(yearGoal),
    fetchDeadlineSection(reading),
  ]);

  return {
    reading,
    today: { pages: today.pages, minutes: today.minutes, goal: dailyGoal },
    streak,
    week,
    queue,
    year,
    recent,
    deadline,
  };
}
