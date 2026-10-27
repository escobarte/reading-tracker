import { getDailyPagesGoal, getYearlyBooksGoal } from "@/lib/db/goals";
import { getFinishedThisYearCount } from "@/lib/db/readings";
import { getCurrentUser } from "@/lib/get-current-user";
import { localYear } from "@/lib/time";
import { SettingsView } from "./SettingsView";

export default async function SettingsPage() {
  const [user, dailyGoal, yearGoal, finishedThisYear] = await Promise.all([
    getCurrentUser(),
    getDailyPagesGoal(),
    getYearlyBooksGoal(localYear(new Date())),
    getFinishedThisYearCount(),
  ]);

  return (
    <SettingsView
      dailyGoal={dailyGoal}
      yearGoal={yearGoal}
      finishedThisYear={finishedThisYear}
      email={user?.email ?? null}
      provider={user?.provider ?? null}
    />
  );
}
