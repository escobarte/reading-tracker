import { createClient } from "@/lib/supabase/server";
import { addDays, daysBetween } from "@/lib/goals";
import { getDailyPagesGoal, getYearlyBooksGoal } from "@/lib/db/goals";
import { getFinishedThisYearCount } from "@/lib/db/readings";
import { getStreakDays } from "@/lib/db/sessions";
import {
  bucketTimeOfDay,
  groupGenres,
  heatmapLevel,
  longestStreakInRange,
  periodRange,
  readingDurationDays,
  startOfWeekKey,
  weeklyBarsForMonth,
  type GenreGroup,
  type Period,
  type TimeOfDayBucket,
} from "@/lib/stats";
import { localDateKey, localDateTimeToUtc, localHour, localYear } from "@/lib/time";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function rangeBoundsUtc(startKey: string, endKey: string) {
  return {
    gte: localDateTimeToUtc(startKey, "00:00").toISOString(),
    lt: localDateTimeToUtc(addDays(endKey, 1), "00:00").toISOString(),
  };
}

export type HeatmapCell = {
  dateKey: string;
  level: 0 | 1 | 2 | 3 | 4;
  inRange: boolean;
  isFuture: boolean;
  isToday: boolean;
};

export type StatsBar = {
  key: string;
  startKey: string;
  endKey: string;
  pages: number;
  isCurrent: boolean;
  isFuture: boolean;
};

export type StatsData = {
  period: Period;
  anchor: string;
  range: { startKey: string; endKey: string } | null;
  tiles: {
    pages: number;
    minutes: number;
    speedPagesPerHour: number | null;
    avgMinutes: number | null;
    avgPages: number | null;
    booksFinished: number;
    streak: number;
  };
  heatmap: { weeks: HeatmapCell[][]; readDays: number; totalDays: number } | null;
  bars: StatsBar[];
  barsGoal: number | null;
  timeOfDay: Record<TimeOfDayBucket, number>;
  hasData: boolean;
  yearGoal: { finished: number; goal: number; daysLeftInYear: number };
};

/** Full `/stats` data for one period view: tiles, calendar, bars, time-of-day — one Promise.all, columns kept minimal. */
export async function getStatsData(period: Period, anchor: string): Promise<StatsData> {
  const supabase = await createClient();
  const todayKey = localDateKey(new Date());
  const currentYear = localYear(new Date());
  const range = periodRange(period, anchor);

  let sessionsQuery = supabase.from("sessions").select("started_at, pages_read, seconds");
  let readingsQuery = supabase.from("readings").select("finished_at").not("finished_at", "is", null);
  if (range) {
    const bounds = rangeBoundsUtc(range.startKey, range.endKey);
    sessionsQuery = sessionsQuery.gte("started_at", bounds.gte).lt("started_at", bounds.lt);
    readingsQuery = readingsQuery.gte("finished_at", bounds.gte).lt("finished_at", bounds.lt);
  }

  const [dailyGoal, yearGoalTarget, finishedThisYear, streak, sessionsRes, readingsRes] = await Promise.all([
    getDailyPagesGoal(),
    getYearlyBooksGoal(currentYear),
    getFinishedThisYearCount(),
    getStreakDays(),
    sessionsQuery,
    readingsQuery,
  ]);
  if (sessionsRes.error) throw sessionsRes.error;
  if (readingsRes.error) throw readingsRes.error;

  const dailyPages = new Map<string, number>();
  let totalPages = 0;
  let totalSeconds = 0;
  let sessionCount = 0;
  let durationSeconds = 0;
  let pagesWithDuration = 0;
  const timeOfDayRows: { hour: number; minutes: number }[] = [];

  for (const row of sessionsRes.data ?? []) {
    const dateKey = localDateKey(row.started_at);
    const pages = row.pages_read ?? 0;
    const seconds = row.seconds ?? 0;
    dailyPages.set(dateKey, (dailyPages.get(dateKey) ?? 0) + pages);
    totalPages += pages;
    totalSeconds += seconds;
    sessionCount += 1;
    if (seconds > 0) {
      durationSeconds += seconds;
      pagesWithDuration += pages;
    }
    timeOfDayRows.push({ hour: localHour(new Date(row.started_at)), minutes: Math.round(seconds / 60) });
  }

  const minutes = Math.round(totalSeconds / 60);
  const tiles: StatsData["tiles"] = {
    pages: totalPages,
    minutes,
    speedPagesPerHour: durationSeconds > 0 ? Math.round((pagesWithDuration / durationSeconds) * 3600) : null,
    avgMinutes: sessionCount > 0 ? Math.round(minutes / sessionCount) : null,
    avgPages: sessionCount > 0 ? Math.round(totalPages / sessionCount) : null,
    booksFinished: (readingsRes.data ?? []).length,
    streak,
  };

  let heatmap: StatsData["heatmap"] = null;
  if (range && (period === "week" || period === "month")) {
    const buildCell = (dateKey: string): HeatmapCell => {
      const inRange = dateKey >= range.startKey && dateKey <= range.endKey;
      const isFuture = dateKey > todayKey;
      const pages = dailyPages.get(dateKey) ?? 0;
      return {
        dateKey,
        level: inRange && !isFuture ? heatmapLevel(pages, dailyGoal) : 0,
        inRange,
        isFuture,
        isToday: dateKey === todayKey,
      };
    };

    const weeks: HeatmapCell[][] = [];
    if (period === "week") {
      const row: HeatmapCell[] = [];
      let cursor = range.startKey;
      for (let i = 0; i < 7; i++) {
        row.push(buildCell(cursor));
        cursor = addDays(cursor, 1);
      }
      weeks.push(row);
    } else {
      const gridStart = startOfWeekKey(range.startKey);
      const gridEnd = addDays(startOfWeekKey(range.endKey), 6);
      let cursor = gridStart;
      let row: HeatmapCell[] = [];
      while (cursor <= gridEnd) {
        row.push(buildCell(cursor));
        if (row.length === 7) {
          weeks.push(row);
          row = [];
        }
        cursor = addDays(cursor, 1);
      }
    }

    let totalDays = 0;
    let readDays = 0;
    let cursor = range.startKey;
    const elapsedEnd = range.endKey < todayKey ? range.endKey : todayKey;
    while (cursor <= elapsedEnd) {
      totalDays++;
      if ((dailyPages.get(cursor) ?? 0) > 0) readDays++;
      cursor = addDays(cursor, 1);
    }
    heatmap = { weeks, readDays, totalDays };
  }

  let bars: StatsBar[] = [];
  let barsGoal: number | null = null;

  if (period === "week" && range) {
    barsGoal = dailyGoal;
    let cursor = range.startKey;
    for (let i = 0; i < 7; i++) {
      bars.push({
        key: cursor,
        startKey: cursor,
        endKey: cursor,
        pages: dailyPages.get(cursor) ?? 0,
        isCurrent: cursor === todayKey,
        isFuture: cursor > todayKey,
      });
      cursor = addDays(cursor, 1);
    }
  } else if (period === "month" && range) {
    barsGoal = dailyGoal * 7;
    bars = weeklyBarsForMonth(dailyPages, range.startKey, range.endKey).map((b) => ({
      key: b.weekStartKey,
      startKey: b.displayStartKey,
      endKey: b.displayEndKey,
      pages: b.pages,
      isCurrent: todayKey >= b.displayStartKey && todayKey <= b.displayEndKey,
      isFuture: b.displayStartKey > todayKey,
    }));
  } else if (period === "year" && range) {
    for (let m = 1; m <= 12; m++) {
      const monthKey = `${anchor}-${pad2(m)}`;
      const monthStart = `${monthKey}-01`;
      let sum = 0;
      for (const [dk, v] of dailyPages) {
        if (dk.startsWith(monthKey)) sum += v;
      }
      bars.push({
        key: monthKey,
        startKey: monthStart,
        endKey: monthStart,
        pages: sum,
        isCurrent: monthKey === todayKey.slice(0, 7),
        isFuture: monthStart > todayKey,
      });
    }
  } else if (period === "all") {
    const byYear = new Map<string, number>();
    for (const [dk, v] of dailyPages) {
      const y = dk.slice(0, 4);
      byYear.set(y, (byYear.get(y) ?? 0) + v);
    }
    const years = Array.from(byYear.keys()).map(Number);
    const minYear = years.length > 0 ? Math.min(...years) : currentYear;
    for (let y = minYear; y <= currentYear; y++) {
      bars.push({
        key: String(y),
        startKey: `${y}-01-01`,
        endKey: `${y}-12-31`,
        pages: byYear.get(String(y)) ?? 0,
        isCurrent: y === currentYear,
        isFuture: false,
      });
    }
  }

  const daysLeftInYear = daysBetween(todayKey, `${currentYear}-12-31`);

  return {
    period,
    anchor,
    range,
    tiles,
    heatmap,
    bars,
    barsGoal,
    timeOfDay: bucketTimeOfDay(timeOfDayRows),
    hasData: sessionCount > 0,
    yearGoal: { finished: finishedThisYear, goal: yearGoalTarget, daysLeftInYear },
  };
}

type ClosedReadingRow = {
  id: string;
  started_at: string | null;
  finished_at: string | null;
  book_id: string;
};

type BookGenreRow = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  total_pages: number | null;
  genre: string | null;
};

export type YearSummaryData = {
  year: number;
  isCurrentYear: boolean;
  hasData: boolean;
  minYear: number;
  maxYear: number;
  goal: { finished: number; goal: number; daysLeftInYear: number | null };
  tiles: { pages: number; hours: number; daysWithReading: number; elapsedDaysInYear: number; sessions: number };
  longestBook: {
    bookId: string;
    title: string;
    author: string | null;
    coverUrl: string | null;
    totalPages: number;
    days: number;
  } | null;
  genre: { groups: GenreGroup[]; noGenreCount: number; totalBooks: number } | null;
  booksByMonth: number[];
  bestMonth: { monthIndex: number; count: number } | null;
  records: {
    bestDay: { pages: number; dateKey: string } | null;
    longestSession: { minutes: number; dateKey: string } | null;
    bestStreak: { length: number; startKey: string | null } | null;
  };
};

/** Full `/stats/year/[year]` data: one Promise.all for the year's sessions, closed readings (with book details), and the earliest session's year (for arrow bounds). */
export async function getYearSummaryData(year: number): Promise<YearSummaryData> {
  const supabase = await createClient();
  const todayKey = localDateKey(new Date());
  const currentYear = localYear(new Date());
  const isCurrentYear = year === currentYear;
  const yearStartKey = `${year}-01-01`;
  const yearEndKey = `${year}-12-31`;
  const effectiveEndKey = isCurrentYear ? todayKey : yearEndKey;
  const bounds = rangeBoundsUtc(yearStartKey, yearEndKey);

  const [yearGoalTarget, sessionsRes, readingsRes, minYearRes] = await Promise.all([
    getYearlyBooksGoal(year),
    supabase.from("sessions").select("started_at, pages_read, seconds").gte("started_at", bounds.gte).lt("started_at", bounds.lt),
    supabase
      .from("readings")
      .select("id, started_at, finished_at, book_id")
      .not("finished_at", "is", null)
      .gte("finished_at", bounds.gte)
      .lt("finished_at", bounds.lt),
    supabase.from("sessions").select("started_at").order("started_at", { ascending: true }).limit(1).maybeSingle(),
  ]);
  if (sessionsRes.error) throw sessionsRes.error;
  if (readingsRes.error) throw readingsRes.error;
  if (minYearRes.error) throw minYearRes.error;

  const closedReadingRows = (readingsRes.data ?? []) as ClosedReadingRow[];
  const bookIds = Array.from(new Set(closedReadingRows.map((r) => r.book_id)));
  const booksByIdRes =
    bookIds.length > 0
      ? await supabase.from("books").select("id, title, author, cover_url, total_pages, genre").in("id", bookIds)
      : { data: [] as BookGenreRow[], error: null };
  if (booksByIdRes.error) throw booksByIdRes.error;
  const booksById = new Map((booksByIdRes.data ?? []).map((b) => [b.id, b as BookGenreRow]));

  const dailyPages = new Map<string, number>();
  let totalPages = 0;
  let totalSeconds = 0;
  let sessionCount = 0;
  let bestDayPages = 0;
  let bestDayKey: string | null = null;
  let longestSessionMinutes = 0;
  let longestSessionKey: string | null = null;

  for (const row of sessionsRes.data ?? []) {
    const dateKey = localDateKey(row.started_at);
    const pages = row.pages_read ?? 0;
    const seconds = row.seconds ?? 0;
    dailyPages.set(dateKey, (dailyPages.get(dateKey) ?? 0) + pages);
    totalPages += pages;
    totalSeconds += seconds;
    sessionCount += 1;
    const dayTotal = dailyPages.get(dateKey)!;
    if (dayTotal > bestDayPages) {
      bestDayPages = dayTotal;
      bestDayKey = dateKey;
    }
    const sessionMinutes = Math.round(seconds / 60);
    if (sessionMinutes > longestSessionMinutes) {
      longestSessionMinutes = sessionMinutes;
      longestSessionKey = dateKey;
    }
  }

  const daysWithReading = Array.from(dailyPages.values()).filter((v) => v > 0).length;
  const elapsedDaysInYear = daysBetween(yearStartKey, effectiveEndKey) + 1;

  const dateKeysWithReading = new Set(
    Array.from(dailyPages.entries())
      .filter(([, v]) => v > 0)
      .map(([k]) => k),
  );
  const bestStreak = longestStreakInRange(dateKeysWithReading, yearStartKey, effectiveEndKey);

  const closedReadings = closedReadingRows;
  const booksByMonth = Array(12).fill(0) as number[];
  let longestBook: YearSummaryData["longestBook"] = null;
  const genreInputs: (string | null | undefined)[] = [];

  for (const reading of closedReadings) {
    const finishedKey = localDateKey(reading.finished_at!);
    const monthIndex = Number(finishedKey.slice(5, 7)) - 1;
    booksByMonth[monthIndex] += 1;
    const book = booksById.get(reading.book_id) ?? null;
    genreInputs.push(book?.genre ?? null);
    if (book?.total_pages && (!longestBook || book.total_pages > longestBook.totalPages)) {
      const startKey = reading.started_at ? localDateKey(reading.started_at) : finishedKey;
      longestBook = {
        bookId: reading.book_id,
        title: book.title,
        author: book.author,
        coverUrl: book.cover_url,
        totalPages: book.total_pages,
        days: readingDurationDays(startKey, finishedKey),
      };
    }
  }

  const { groups, noGenreCount } = groupGenres(genreInputs);
  const genre = groups.length > 0 ? { groups: groups.slice(0, 4), noGenreCount, totalBooks: closedReadings.length } : null;

  let bestMonth: YearSummaryData["bestMonth"] = null;
  for (let i = 0; i < 12; i++) {
    if (booksByMonth[i] > 0 && (!bestMonth || booksByMonth[i] > bestMonth.count)) {
      bestMonth = { monthIndex: i, count: booksByMonth[i] };
    }
  }

  const minYear = minYearRes.data?.started_at ? localYear(minYearRes.data.started_at) : currentYear;

  return {
    year,
    isCurrentYear,
    hasData: sessionCount > 0 || closedReadings.length > 0,
    minYear,
    maxYear: currentYear,
    goal: {
      finished: closedReadings.length,
      goal: yearGoalTarget,
      daysLeftInYear: isCurrentYear ? daysBetween(todayKey, yearEndKey) : null,
    },
    tiles: {
      pages: totalPages,
      hours: Math.round(totalSeconds / 3600),
      daysWithReading,
      elapsedDaysInYear,
      sessions: sessionCount,
    },
    longestBook,
    genre,
    booksByMonth,
    bestMonth,
    records: {
      bestDay: bestDayKey ? { pages: bestDayPages, dateKey: bestDayKey } : null,
      longestSession: longestSessionKey ? { minutes: longestSessionMinutes, dateKey: longestSessionKey } : null,
      bestStreak: bestStreak.length > 0 ? bestStreak : null,
    },
  };
}

/** Genres already used by the owner's books, most common spelling first — for the genre field's suggestions. */
export async function getGenreSuggestions(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("books").select("genre").not("genre", "is", null);
  if (error) throw error;
  const { groups } = groupGenres((data ?? []).map((b) => b.genre));
  return groups.map((g) => g.label);
}

/** Pages/day over the trailing 14 local days for a reading — for the book page's pace forecast. */
export async function getRecentPace(readingId: string): Promise<number> {
  const supabase = await createClient();
  const { localTrailingDaysRangeUtc } = await import("@/lib/time");
  const { start, end } = localTrailingDaysRangeUtc(14);
  const { data, error } = await supabase
    .from("sessions")
    .select("pages_read")
    .eq("reading_id", readingId)
    .gte("started_at", start.toISOString())
    .lt("started_at", end.toISOString());
  if (error) throw error;
  const total = (data ?? []).reduce((sum, s) => sum + (s.pages_read ?? 0), 0);
  return total / 14;
}
