import { listBooks } from "@/lib/db/books";
import { getDailyPagesGoal } from "@/lib/db/goals";
import { getTodaySummary } from "@/lib/db/sessions";
import { LibraryView } from "./LibraryView";

export default async function LibraryPage() {
  const [books, goal, today] = await Promise.all([listBooks(), getDailyPagesGoal(), getTodaySummary()]);
  return <LibraryView initialBooks={books} today={{ pages: today.pages, goal }} />;
}
