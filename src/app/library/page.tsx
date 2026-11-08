import { listBooks } from "@/lib/db/books";
import { getDailyPagesGoal } from "@/lib/db/goals";
import { getLatestReadingByBook } from "@/lib/db/readings";
import { getTodaySummary } from "@/lib/db/sessions";
import { localYear } from "@/lib/time";
import { LibraryView } from "./LibraryView";

export default async function LibraryPage() {
  const [books, goal, today] = await Promise.all([listBooks(), getDailyPagesGoal(), getTodaySummary()]);

  const archiveIds = books
    .filter((book) => book.shelf === "done" || book.shelf === "paused" || book.shelf === "dropped")
    .map((book) => book.id);
  const readingByBookId = await getLatestReadingByBook(archiveIds);

  return (
    <LibraryView
      initialBooks={books}
      today={{ pages: today.pages, goal }}
      readingByBookId={Object.fromEntries(readingByBookId)}
      currentYear={localYear(new Date())}
    />
  );
}
