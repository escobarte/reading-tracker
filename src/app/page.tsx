import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, dictionaries, isLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { formatHomeDate, localHour } from "@/lib/time";
import { getHomeData } from "@/lib/db/home";
import { HomeView } from "./HomeView";

function greetingFor(hour: number, t: Dictionary): string {
  if (hour >= 5 && hour < 12) return t.home.greetingMorning;
  if (hour >= 12 && hour < 18) return t.home.greetingAfternoon;
  if (hour >= 18 && hour < 23) return t.home.greetingEvening;
  return t.home.greetingNight;
}

export default async function HomePage() {
  const [data, cookieStore] = await Promise.all([getHomeData(), cookies()]);
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const t = dictionaries[locale];

  const now = new Date();
  const greeting = greetingFor(localHour(now), t);
  const dateLabel = formatHomeDate(now, locale);

  return <HomeView data={data} greeting={greeting} dateLabel={dateLabel} />;
}
