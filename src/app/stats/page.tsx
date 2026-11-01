import { getDailyPagesGoal } from "@/lib/db/goals";
import { getTodaySummary } from "@/lib/db/sessions";
import { getStatsData } from "@/lib/db/stats";
import { normalizeAnchor, type Period } from "@/lib/stats";
import { localDateKey } from "@/lib/time";
import { StatsView } from "./StatsView";

function parsePeriod(value: string | string[] | undefined): Period {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "week" || v === "year" || v === "all" ? v : "month";
}

function parseAnchor(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  const sp = await searchParams;
  const period = parsePeriod(sp.p);
  const todayKey = localDateKey(new Date());
  const anchor = normalizeAnchor(period, parseAnchor(sp.d), todayKey);

  const [data, dailyGoal, todaySummary] = await Promise.all([
    getStatsData(period, anchor),
    getDailyPagesGoal(),
    getTodaySummary(),
  ]);

  return <StatsView data={data} today={{ pages: todaySummary.pages, goal: dailyGoal }} />;
}
