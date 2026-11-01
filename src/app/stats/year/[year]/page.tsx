import { notFound } from "next/navigation";
import { getDailyPagesGoal } from "@/lib/db/goals";
import { getTodaySummary } from "@/lib/db/sessions";
import { getYearSummaryData } from "@/lib/db/stats";
import { YearSummaryView } from "./YearSummaryView";

export default async function YearSummaryPage({ params }: PageProps<"/stats/year/[year]">) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year) || String(year) !== yearParam) notFound();

  const [data, dailyGoal, todaySummary] = await Promise.all([
    getYearSummaryData(year),
    getDailyPagesGoal(),
    getTodaySummary(),
  ]);

  return <YearSummaryView data={data} today={{ pages: todaySummary.pages, goal: dailyGoal }} />;
}
