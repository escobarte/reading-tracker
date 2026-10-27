import { notFound } from "next/navigation";
import { getBook } from "@/lib/db/books";
import { getDailyPagesGoal, getDeadlineForReading } from "@/lib/db/goals";
import { getLatestReading } from "@/lib/db/readings";
import { getMaxPageForReading, getReadingStats, getTodaySummary, listRecentSessions } from "@/lib/db/sessions";
import { BookDetail } from "./BookDetail";

export default async function BookPage({ params }: PageProps<"/books/[id]">) {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) notFound();

  const reading = await getLatestReading(id);
  const openReading = reading && !reading.finished_at && book.shelf === "reading" ? reading : null;

  const [currentPage, stats, sessions, deadline, goal, today] = await Promise.all([
    reading ? getMaxPageForReading(reading.id) : Promise.resolve(0),
    reading ? getReadingStats(reading.id) : Promise.resolve(null),
    reading ? listRecentSessions(reading.id, 5) : Promise.resolve([]),
    openReading && book.total_pages ? getDeadlineForReading(openReading.id, book.total_pages) : Promise.resolve(null),
    getDailyPagesGoal(),
    getTodaySummary(),
  ]);

  return (
    <BookDetail
      book={book}
      currentPage={currentPage}
      stats={stats}
      sessions={sessions}
      readingId={openReading?.id ?? null}
      deadline={deadline}
      today={{ pages: today.pages, goal }}
    />
  );
}
