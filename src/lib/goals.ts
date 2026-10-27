/**
 * Чистые функции расчёта целей: дедлайн по книге (норма страниц в день) и
 * читаемые дни недели. Без обращения к БД, без локали — только числа и
 * даты-ключи "YYYY-MM-DD" (дни в Europe/Bucharest, см. `src/lib/time.ts`).
 */

export const DEFAULT_DAILY_PAGES_GOAL = 30;
export const DEFAULT_YEAR_BOOKS_GOAL = 24;

/** 1 = понедельник … 7 = воскресенье (неделя с понедельника). */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

function parseDateKey(dateKey: string): [number, number, number] {
  const [y, m, d] = dateKey.split("-").map(Number);
  return [y, m, d];
}

function toUtcMs(dateKey: string): number {
  const [y, m, d] = parseDateKey(dateKey);
  return Date.UTC(y, m - 1, d);
}

/** Дата-ключ, сдвинутый на `days` дней (может быть отрицательным). */
export function addDays(dateKey: string, days: number): string {
  return new Date(toUtcMs(dateKey) + days * 86400000).toISOString().slice(0, 10);
}

/** Число дней от `fromKey` до `toKey` (может быть отрицательным). */
export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((toUtcMs(toKey) - toUtcMs(fromKey)) / 86400000);
}

/** День недели даты: 1 (Пн) … 7 (Вс). */
export function weekdayOf(dateKey: string): Weekday {
  const jsDay = new Date(toUtcMs(dateKey)).getUTCDay(); // 0 (Вс) … 6 (Сб)
  return (jsDay === 0 ? 7 : jsDay) as Weekday;
}

/** Число дней от `fromKey` до `toKey` включительно, кроме дней недели из `skipWeekdays`. */
export function countReadableDays(fromKey: string, toKey: string, skipWeekdays: number[]): number {
  const total = daysBetween(fromKey, toKey);
  if (total < 0) return 0;
  let count = 0;
  for (let i = 0; i <= total; i++) {
    if (!skipWeekdays.includes(weekdayOf(addDays(fromKey, i)))) count++;
  }
  return count;
}

/** Режим «За N дней»: срок = сегодня + N − 1 (28 дней = сегодня и ещё 27). */
export function dueDateFromDaysMode(todayKey: string, days: number): string {
  return addDays(todayKey, Math.max(1, days) - 1);
}

/** Режим «К дате»: обратный расчёт N по выбранной дате. */
export function daysModeFromDueDate(todayKey: string, dueDateKey: string): number {
  return daysBetween(todayKey, dueDateKey) + 1;
}

export type DeadlineComputationInput = {
  todayKey: string;
  dueDateKey: string;
  skipWeekdays: number[];
  /** Остаток на начало дня: total_pages − максимальная page_to среди сессий до сегодня. */
  remainingPages: number;
  /** Страниц, прочитанных сегодня по этому прочтению. */
  pagesReadToday: number;
};

export type DeadlineComputation =
  | { status: "expired" }
  | {
      status: "on-track" | "behind";
      normPerDay: number;
      doneToday: number;
      remainingPages: number;
      readableDaysFromToday: number;
      totalDaysInPeriod: number;
      isReadingDay: boolean;
      tomorrowWarningNorm: number | null;
    };

export function computeDeadlineNorm(input: DeadlineComputationInput): DeadlineComputation {
  const { todayKey, dueDateKey, skipWeekdays, pagesReadToday } = input;
  const remaining = Math.max(0, input.remainingPages);

  const totalDaysInPeriod = daysBetween(todayKey, dueDateKey) + 1;
  if (totalDaysInPeriod <= 0) return { status: "expired" };

  const readableDaysFromToday = countReadableDays(todayKey, dueDateKey, skipWeekdays);
  if (readableDaysFromToday <= 0) return { status: "expired" };

  const normPerDay = remaining === 0 ? 0 : Math.ceil(remaining / readableDaysFromToday);
  const isReadingDay = !skipWeekdays.includes(weekdayOf(todayKey));

  const tomorrowKey = addDays(todayKey, 1);
  const readableDaysFromTomorrow = countReadableDays(tomorrowKey, dueDateKey, skipWeekdays);
  const tomorrowWarningNorm =
    remaining > 0 && readableDaysFromTomorrow > 0 ? Math.ceil(remaining / readableDaysFromTomorrow) : null;

  return {
    status: pagesReadToday >= normPerDay ? "on-track" : "behind",
    normPerDay,
    doneToday: pagesReadToday,
    remainingPages: remaining,
    readableDaysFromToday,
    totalDaysInPeriod,
    isReadingDay,
    tomorrowWarningNorm,
  };
}
