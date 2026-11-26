import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { books, readings, sessions } from "@/db/schema";
import { getDailyPagesGoal, getDeadlineForReading } from "@/lib/db/goals";
import type { DeadlineCardData } from "@/lib/db/goals";
import { getQuoteOfDay, type NoteWithBook } from "@/lib/db/notes";
import { requireUserId } from "@/lib/require-user";
import { localDateKey, localWeekRangeUtc } from "@/lib/time";
import { getYearPlan, type YearPlan } from "./books";
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
  rating: number | null;
};

export type HomeData = {
  reading: HomeReadingBook[];
  today: { pages: number; minutes: number; goal: number };
  streak: number;
  week: { days: HomeWeekDay[]; totalPages: number; totalMinutes: number; goalPages: number };
  queue: HomeQueueBook[];
  year: YearPlan;
  recent: HomeRecentBook[];
  /** Дедлайны всех читаемых книг (только у кого задан), чтобы блок «Дедлайн» синхронизировался со свайпом карусели. */
  deadlines: HomeDeadline[];
  quoteOfDay: NoteWithBook | null;
};

async function fetchReadingSection(): Promise<HomeReadingBook[]> {
  const userId = await requireUserId();
  const db = getDb();
  const readingBooks = await db
    .select()
    .from(books)
    .where(and(eq(books.user_id, userId), eq(books.shelf, "reading")));
  if (readingBooks.length === 0) return [];

  const bookIds = readingBooks.map((b) => b.id);
  const openReadings = await db
    .select({ id: readings.id, book_id: readings.book_id, started_at: readings.started_at })
    .from(readings)
    .where(
      and(eq(readings.user_id, userId), inArray(readings.book_id, bookIds), isNull(readings.finished_at)),
    );

  const readingIdToBookId = new Map(openReadings.map((r) => [r.id, r.book_id]));
  const readingIdByBookId = new Map(openReadings.map((r) => [r.book_id, r.id]));
  const startedAtByBookId = new Map(openReadings.map((r) => [r.book_id, r.started_at ?? ""]));
  const readingIds = openReadings.map((r) => r.id);

  const currentPageByBookId = new Map<string, number>();
  if (readingIds.length > 0) {
    const sessionRows = await db
      .select({ reading_id: sessions.reading_id, page_to: sessions.page_to })
      .from(sessions)
      .where(and(eq(sessions.user_id, userId), inArray(sessions.reading_id, readingIds)));
    for (const row of sessionRows) {
      if (row.page_to == null) continue;
      const bookId = readingIdToBookId.get(row.reading_id);
      if (!bookId) continue;
      const prev = currentPageByBookId.get(bookId) ?? 0;
      if (row.page_to > prev) currentPageByBookId.set(bookId, row.page_to);
    }
  }

  return readingBooks
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

/** Дедлайны всех читаемых книг, у кого он задан — блок на главной показывает дедлайн книги, видимой в карусели. */
async function fetchDeadlineSection(reading: HomeReadingBook[]): Promise<HomeDeadline[]> {
  const results = await Promise.all(
    reading
      .filter((book) => book.readingId && book.totalPages)
      .map(async (book) => {
        const computed = await getDeadlineForReading(book.readingId, book.totalPages as number);
        return computed ? { ...computed, bookId: book.id, bookTitle: book.title, readingId: book.readingId } : null;
      }),
  );
  return results.filter((result): result is HomeDeadline => result !== null);
}

async function fetchQueueSection(): Promise<HomeQueueBook[]> {
  const userId = await requireUserId();
  const queue = await getDb()
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      cover_url: books.cover_url,
      queue_position: books.queue_position,
    })
    .from(books)
    .where(and(eq(books.user_id, userId), eq(books.shelf, "want")))
    .orderBy(sql`${books.queue_position} asc nulls last`)
    .limit(6);
  return queue.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.cover_url,
    position: book.queue_position ?? 0,
  }));
}

async function fetchWeekSection(dailyGoal: number): Promise<HomeData["week"]> {
  const userId = await requireUserId();
  const todayKey = localDateKey(new Date());
  const { start, end } = localWeekRangeUtc();

  const weekSessions = await getDb()
    .select({ started_at: sessions.started_at, pages_read: sessions.pages_read, seconds: sessions.seconds })
    .from(sessions)
    .where(
      and(
        eq(sessions.user_id, userId),
        gte(sessions.started_at, start.toISOString()),
        lt(sessions.started_at, end.toISOString()),
      ),
    );

  const pagesByDay = new Map<string, number>();
  let totalMinutes = 0;
  for (const session of weekSessions) {
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

async function fetchRecentSection(): Promise<HomeRecentBook[]> {
  const userId = await requireUserId();
  const db = getDb();
  const finished = await db
    .select({ book_id: readings.book_id, finished_at: readings.finished_at, rating: readings.rating })
    .from(readings)
    .where(and(eq(readings.user_id, userId), isNotNull(readings.finished_at), eq(readings.is_dropped, false)))
    .orderBy(desc(readings.finished_at))
    .limit(30);

  const orderedBookIds: string[] = [];
  const ratingByBookId = new Map<string, number | null>();
  const seen = new Set<string>();
  for (const reading of finished) {
    if (seen.has(reading.book_id)) continue;
    seen.add(reading.book_id);
    orderedBookIds.push(reading.book_id);
    ratingByBookId.set(reading.book_id, reading.rating);
    if (orderedBookIds.length >= 6) break;
  }
  if (orderedBookIds.length === 0) return [];

  const recentBooks = await db
    .select({ id: books.id, title: books.title, cover_url: books.cover_url })
    .from(books)
    .where(and(eq(books.user_id, userId), inArray(books.id, orderedBookIds)));

  const byId = new Map(recentBooks.map((book) => [book.id, book]));
  return orderedBookIds
    .map((id) => byId.get(id))
    .filter((book): book is NonNullable<typeof book> => Boolean(book))
    .map((book) => ({
      id: book.id,
      title: book.title,
      coverUrl: book.cover_url,
      rating: ratingByBookId.get(book.id) ?? null,
    }));
}

export async function getHomeData(): Promise<HomeData> {
  const [dailyGoal, year, reading, today, streak, queue, recent, quoteOfDay] = await Promise.all([
    getDailyPagesGoal(),
    getYearPlan(),
    fetchReadingSection(),
    getTodaySummary(),
    getStreakDays(),
    fetchQueueSection(),
    fetchRecentSection(),
    getQuoteOfDay(),
  ]);

  const [week, deadlines] = await Promise.all([
    fetchWeekSection(dailyGoal),
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
    deadlines,
    quoteOfDay,
  };
}
