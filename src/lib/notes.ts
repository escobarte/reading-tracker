/** Чистые функции для заметок: выбор «цитаты дня» и группировка по дням. Запросы — в `src/lib/db/notes.ts`. */

/** Детерминированный хэш строки (дня), без Math.random — тот же день всегда даёт то же число. */
function hashDateKey(dateKey: string): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export type WeightedQuote = { id: string; isFavorite: boolean };

/**
 * Выбирает цитату дня: детерминированно по дате (Europe/Bucharest), избранные весят вдвое.
 * Список цитат должен быть в стабильном порядке (например, по `id`) — иначе выбор «поплывёт».
 */
export function pickQuoteOfDay<T extends WeightedQuote>(quotes: T[], todayKey: string): T | null {
  if (quotes.length === 0) return null;
  const weights = quotes.map((q) => (q.isFavorite ? 2 : 1));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let target = hashDateKey(todayKey) % total;
  for (let i = 0; i < quotes.length; i++) {
    if (target < weights[i]) return quotes[i];
    target -= weights[i];
  }
  return quotes[quotes.length - 1];
}

export type NoteDayGroup = "today" | "yesterday" | "earlier";

/** Группа дня для заголовка списка заметок: «Сегодня» / «Вчера» / дата. */
export function noteDayGroup(dateKey: string, todayKey: string, yesterdayKey: string): NoteDayGroup {
  if (dateKey === todayKey) return "today";
  if (dateKey === yesterdayKey) return "yesterday";
  return "earlier";
}
