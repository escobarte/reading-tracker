/**
 * Чистые функции расчёта статистики: периоды, календарь чтения, время
 * суток, жанры, рекорды. Без обращения к БД и без локали — только числа
 * и даты-ключи "YYYY-MM-DD" (дни в Europe/Bucharest, см. `src/lib/time.ts`).
 */

import { addDays, daysBetween, dueDateFromDaysMode, weekdayOf } from "@/lib/goals";

export type Period = "week" | "month" | "year" | "all";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Monday of the week containing `dateKey`. */
export function startOfWeekKey(dateKey: string): string {
  return addDays(dateKey, -(weekdayOf(dateKey) - 1));
}

export type PeriodRange = { startKey: string; endKey: string };

/** Inclusive date-key range for `period` anchored at `anchor` ("all" has no range — caller doesn't filter by date). */
export function periodRange(period: Period, anchor: string): PeriodRange | null {
  switch (period) {
    case "week":
      return { startKey: anchor, endKey: addDays(anchor, 6) };
    case "month": {
      const [y, m] = anchor.split("-").map(Number);
      return { startKey: `${anchor}-01`, endKey: `${anchor}-${pad2(daysInMonth(y, m))}` };
    }
    case "year":
      return { startKey: `${anchor}-01-01`, endKey: `${anchor}-12-31` };
    case "all":
      return null;
  }
}

/** Default anchor for `period` containing `todayKey` — Monday of this week / this month / this year. */
export function defaultAnchor(period: Period, todayKey: string): string {
  switch (period) {
    case "week":
      return startOfWeekKey(todayKey);
    case "month":
      return todayKey.slice(0, 7);
    case "year":
      return todayKey.slice(0, 4);
    case "all":
      return "";
  }
}

/** Anchor shifted by `delta` periods (±1 for the ‹ › navigation). */
export function shiftAnchor(period: Period, anchor: string, delta: number): string {
  switch (period) {
    case "week":
      return addDays(anchor, delta * 7);
    case "month": {
      const [y, m] = anchor.split("-").map(Number);
      const total = y * 12 + (m - 1) + delta;
      return `${Math.floor(total / 12)}-${pad2((total % 12) + 1)}`;
    }
    case "year":
      return String(Number(anchor) + delta);
    case "all":
      return "";
  }
}

/** False once the next period would start after today — navigation into the future is blocked. */
export function canGoNext(period: Period, anchor: string, todayKey: string): boolean {
  if (period === "all") return false;
  const next = periodRange(period, shiftAnchor(period, anchor, 1));
  return next !== null && next.startKey <= todayKey;
}

const ANCHOR_PATTERN: Record<Exclude<Period, "all">, RegExp> = {
  week: /^\d{4}-\d{2}-\d{2}$/,
  month: /^\d{4}-\d{2}$/,
  year: /^\d{4}$/,
};

/** Validates and normalizes a `d` URL param for `period`; falls back to the current period's default. */
export function normalizeAnchor(period: Period, raw: string | undefined, todayKey: string): string {
  if (period === "all") return "";
  if (!raw || !ANCHOR_PATTERN[period].test(raw)) return defaultAnchor(period, todayKey);
  if (period === "week") return startOfWeekKey(raw);
  return raw;
}

/** Heatmap cell level (0 empty, 1–4 by % of the daily goal): <50% → 1, 50–99% → 2, 100–149% → 3, ≥150% → 4. */
export function heatmapLevel(pages: number, dailyGoal: number): 0 | 1 | 2 | 3 | 4 {
  if (pages <= 0) return 0;
  if (dailyGoal <= 0) return 4;
  const ratio = pages / dailyGoal;
  if (ratio < 0.5) return 1;
  if (ratio < 1) return 2;
  if (ratio < 1.5) return 3;
  return 4;
}

export type WeekBarBucket = { weekStartKey: string; displayStartKey: string; displayEndKey: string; pages: number };

/** Groups a month's daily page sums into Monday-start week buckets, clipped to the month's own days. */
export function weeklyBarsForMonth(
  dailyPages: Map<string, number>,
  monthStartKey: string,
  monthEndKey: string,
): WeekBarBucket[] {
  const order: string[] = [];
  const buckets = new Map<string, WeekBarBucket>();
  let cursor = monthStartKey;
  while (cursor <= monthEndKey) {
    const weekStartKey = startOfWeekKey(cursor);
    let bucket = buckets.get(weekStartKey);
    if (!bucket) {
      bucket = { weekStartKey, displayStartKey: cursor, displayEndKey: cursor, pages: 0 };
      buckets.set(weekStartKey, bucket);
      order.push(weekStartKey);
    }
    bucket.displayEndKey = cursor;
    bucket.pages += dailyPages.get(cursor) ?? 0;
    cursor = addDays(cursor, 1);
  }
  return order.map((key) => buckets.get(key)!);
}

export type TimeOfDayBucket = "morning" | "day" | "evening" | "night";

/** Утро 05–11, День 11–17, Вечер 17–23, Ночь 23–05, по часу начала сессии (0–23). */
export function timeOfDayBucket(hour: number): TimeOfDayBucket {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 23) return "evening";
  return "night";
}

/** Sums minutes of reading per time-of-day bucket. */
export function bucketTimeOfDay(sessions: { hour: number; minutes: number }[]): Record<TimeOfDayBucket, number> {
  const result: Record<TimeOfDayBucket, number> = { morning: 0, day: 0, evening: 0, night: 0 };
  for (const s of sessions) result[timeOfDayBucket(s.hour)] += s.minutes;
  return result;
}

export type GenreGroup = { label: string; count: number };

/**
 * Groups genres case/edge-insensitively, keeping the most common original spelling as the display label.
 * Empty/null genres are excluded from `groups` and counted in `noGenreCount`.
 */
export function groupGenres(genres: (string | null | undefined)[]): { groups: GenreGroup[]; noGenreCount: number } {
  const variantsByKey = new Map<string, Map<string, number>>();
  let noGenreCount = 0;

  for (const raw of genres) {
    const trimmed = raw?.trim() ?? "";
    if (!trimmed) {
      noGenreCount++;
      continue;
    }
    const key = trimmed.toLowerCase();
    const variants = variantsByKey.get(key) ?? new Map<string, number>();
    variants.set(trimmed, (variants.get(trimmed) ?? 0) + 1);
    variantsByKey.set(key, variants);
  }

  const groups: GenreGroup[] = [];
  for (const variants of variantsByKey.values()) {
    let total = 0;
    let bestLabel = "";
    let bestCount = -1;
    for (const [label, count] of variants) {
      total += count;
      if (count > bestCount) {
        bestCount = count;
        bestLabel = label;
      }
    }
    groups.push({ label: bestLabel, count: total });
  }
  groups.sort((a, b) => b.count - a.count);
  return { groups, noGenreCount };
}

/** Longest run of consecutive dates in `dateKeys` within [startKey, endKey], and the day it started. */
export function longestStreakInRange(
  dateKeys: Set<string>,
  startKey: string,
  endKey: string,
): { length: number; startKey: string | null } {
  let best = 0;
  let bestStart: string | null = null;
  let curLen = 0;
  let curStart: string | null = null;
  let cursor = startKey;
  while (cursor <= endKey) {
    if (dateKeys.has(cursor)) {
      if (curLen === 0) curStart = cursor;
      curLen++;
      if (curLen > best) {
        best = curLen;
        bestStart = curStart;
      }
    } else {
      curLen = 0;
      curStart = null;
    }
    cursor = addDays(cursor, 1);
  }
  return { length: best, startKey: bestStart };
}

/** Days between a reading's start and finish, inclusive on both ends. */
export function readingDurationDays(startKey: string, endKey: string): number {
  return daysBetween(startKey, endKey) + 1;
}

/**
 * Finish date at the current pace (pages/day over the last 14 days), or `null` when there's
 * nothing to forecast: no recent pace, or nothing left to read.
 */
export function forecastFinishDate(todayKey: string, remainingPages: number, pagesPerDay: number): string | null {
  if (pagesPerDay <= 0 || remainingPages <= 0) return null;
  const daysNeeded = Math.ceil(remainingPages / pagesPerDay);
  return dueDateFromDaysMode(todayKey, daysNeeded);
}
