import type { Locale } from "./types";

export type PluralUnit = "day" | "session" | "page" | "book" | "minute";

const RU_FORMS: Record<PluralUnit, [string, string, string]> = {
  day: ["день", "дня", "дней"],
  session: ["сессия", "сессии", "сессий"],
  page: ["страница", "страницы", "страниц"],
  book: ["книга", "книги", "книг"],
  minute: ["минута", "минуты", "минут"],
};

const EN_FORMS: Record<PluralUnit, [string, string]> = {
  day: ["day", "days"],
  session: ["session", "sessions"],
  page: ["page", "pages"],
  book: ["book", "books"],
  minute: ["minute", "minutes"],
};

/** 0: один (1, 21…) · 1: немного (2–4, 22–24…) · 2: много (0, 5–20, 25–30…) */
function ruPluralIndex(n: number): 0 | 1 | 2 {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 14) return 2;
  if (mod10 === 1) return 0;
  if (mod10 >= 2 && mod10 <= 4) return 1;
  return 2;
}

export function pluralWord(n: number, unit: PluralUnit, locale: Locale): string {
  if (locale === "ru") return RU_FORMS[unit][ruPluralIndex(n)];
  return EN_FORMS[unit][Math.abs(Math.trunc(n)) === 1 ? 0 : 1];
}

/** "{n} {word}" with the word correctly inflected for the count, e.g. "1 день" / "5 дней" / "2 days". */
export function formatCount(n: number, unit: PluralUnit, locale: Locale): string {
  return `${n} ${pluralWord(n, unit, locale)}`;
}
