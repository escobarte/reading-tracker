import { getDailyPagesGoal, getYearlyBooksGoal } from "@/lib/db/goals";
import { getFinishedThisYearCount } from "@/lib/db/readings";
import { getTodaySummary } from "@/lib/db/sessions";
import { getCurrentUser } from "@/lib/get-current-user";
import { localYear } from "@/lib/time";
import { SettingsView } from "./SettingsView";

export default async function SettingsPage() {
  const [user, dailyGoal, yearGoal, finishedThisYear, today] = await Promise.all([
    getCurrentUser(),
    getDailyPagesGoal(),
    getYearlyBooksGoal(localYear(new Date())),
    getFinishedThisYearCount(),
    getTodaySummary(),
  ]);

  return (
    <SettingsView
      dailyGoal={dailyGoal}
      yearGoal={yearGoal}
      finishedThisYear={finishedThisYear}
      email={user?.email ?? null}
      provider={user?.provider ?? null}
      today={{ pages: today.pages, goal: dailyGoal }}
    />
  );
}
