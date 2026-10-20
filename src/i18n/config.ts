import type { Dictionary, Locale } from "./types";
import ru from "./dictionaries/ru";
import en from "./dictionaries/en";

export const LOCALE_COOKIE = "locale";
export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALES: Locale[] = ["ru", "en"];

export const dictionaries: Record<Locale, Dictionary> = { ru, en };

export function isLocale(value: string | undefined): value is Locale {
  return value === "ru" || value === "en";
}
