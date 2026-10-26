export const APP_TIMEZONE = "Europe/Bucharest";

/** Offset in minutes such that localTime = utcTime + offset, for the given instant. */
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUtc - date.getTime()) / 60000;
}

/** "YYYY-MM-DD" calendar day the given instant falls on, in `timeZone`. */
export function localDateKey(date: Date | string = new Date(), timeZone = APP_TIMEZONE): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** "HH:MM" local time of the given instant, in `timeZone`. */
export function localTimeKey(date: Date = new Date(), timeZone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

/** "YYYY-MM" calendar month the given instant falls on, in `timeZone`. */
export function localMonthKey(date: Date | string = new Date(), timeZone = APP_TIMEZONE): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).format(d);
}

/** UTC instant for a "YYYY-MM-DD" date and "HH:MM" time, interpreted in `timeZone`. */
export function localDateTimeToUtc(dateKey: string, timeKey: string, timeZone = APP_TIMEZONE): Date {
  const [hh, mm] = timeKey.split(":").map(Number);
  const guess = new Date(`${dateKey}T00:00:00Z`);
  const offsetMin = tzOffsetMinutes(guess, timeZone);
  const localMidnightUtcMs = guess.getTime() - offsetMin * 60000;
  return new Date(localMidnightUtcMs + (hh * 60 + mm) * 60000);
}

/** UTC instant of local midnight for the day containing `date`. */
export function startOfLocalDay(date: Date = new Date(), timeZone = APP_TIMEZONE): Date {
  const offsetMin = tzOffsetMinutes(date, timeZone);
  const localMs = date.getTime() + offsetMin * 60000;
  const localMidnightMs = Math.floor(localMs / 86400000) * 86400000;
  return new Date(localMidnightMs - offsetMin * 60000);
}

/** [start, end) UTC instants bounding the local calendar day containing `date`. */
export function localDayRangeUtc(
  date: Date = new Date(),
  timeZone = APP_TIMEZONE,
): { start: Date; end: Date } {
  const start = startOfLocalDay(date, timeZone);
  return { start, end: new Date(start.getTime() + 86400000) };
}

/** Length of the longest run of consecutive local days (ending today or yesterday) present in `dateKeys`. */
export function computeStreak(dateKeys: Set<string>, timeZone = APP_TIMEZONE): number {
  let cursor = new Date();
  if (!dateKeys.has(localDateKey(cursor, timeZone))) {
    cursor = new Date(cursor.getTime() - 86400000);
  }
  let streak = 0;
  while (dateKeys.has(localDateKey(cursor, timeZone))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
}

/** "HH:MM:SS" clock display for a duration in seconds. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return [hh, mm, ss].map((n) => String(n).padStart(2, "0")).join(":");
}

/** e.g. "26 мин 14 с" / "26 min 14 s", units passed in translated. */
export function formatMinutesSeconds(totalSeconds: number, minuteUnit: string, secondUnit: string): string {
  const total = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes} ${minuteUnit} ${seconds} ${secondUnit}`;
}

/** e.g. "5 ч 38 м" / "5 h 38 m", units passed in translated. */
export function formatHoursMinutes(totalMinutes: number, hourUnit: string, minuteUnit: string): string {
  const total = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} ${minuteUnit}`;
  return `${hours} ${hourUnit} ${minutes} ${minuteUnit}`;
}

/** Weekday + day + month for a history row, formatted per locale in the app timezone. */
export function formatHistoryDate(date: Date | string, locale: "ru" | "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const formatted = new Intl.DateTimeFormat(locale === "ru" ? "ru-RO" : "en-GB", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(d);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Day + short month, e.g. "6 окт" / "6 Oct", for compact labels. */
export function formatShortDate(date: Date | string, locale: "ru" | "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RO" : "en-GB", {
    timeZone: APP_TIMEZONE,
    day: "numeric",
    month: "short",
  }).format(d);
}

/** Month + year for a group header, e.g. "Октябрь 2026" / "October 2026". */
export function formatMonthLabel(date: Date | string, locale: "ru" | "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const formatted = new Intl.DateTimeFormat(locale === "ru" ? "ru-RO" : "en-GB", {
    timeZone: APP_TIMEZONE,
    month: "long",
    year: "numeric",
  }).format(d);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
