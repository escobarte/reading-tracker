import { getDailyPagesGoal } from "@/lib/db/goals";
import { getTodaySummary } from "@/lib/db/sessions";
import { getCurrentUser } from "@/lib/get-current-user";
import { SettingsView } from "./SettingsView";

export default async function SettingsPage() {
  const [user, dailyGoal, today] = await Promise.all([getCurrentUser(), getDailyPagesGoal(), getTodaySummary()]);

  return (
    <SettingsView
      dailyGoal={dailyGoal}
      email={user?.email ?? null}
      provider={user?.provider ?? null}
      today={{ pages: today.pages, goal: dailyGoal }}
    />
  );
}
