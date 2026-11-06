import { notFound, redirect } from "next/navigation";
import { getBook } from "@/lib/db/books";
import { getDailyPagesGoal } from "@/lib/db/goals";
import { getLatestFinishedReading, getReading } from "@/lib/db/readings";
import { getReadingWrapupStats, getTodaySummary } from "@/lib/db/sessions";
import { FinishScreen } from "./FinishScreen";

export default async function BookFinishPage({ params, searchParams }: PageProps<"/books/[id]/finish">) {
  const { id } = await params;
  const { reading: readingParam } = await searchParams;
  const requestedId = Array.isArray(readingParam) ? readingParam[0] : readingParam;

  const book = await getBook(id);
  if (!book) notFound();

  const reading = requestedId ? await getReading(requestedId) : await getLatestFinishedReading(id);
  if (!reading || reading.book_id !== id || !reading.finished_at) {
    redirect(`/books/${id}`);
  }

  const [stats, dailyGoal, today] = await Promise.all([
    getReadingWrapupStats(reading.id),
    getDailyPagesGoal(),
    getTodaySummary(),
  ]);

  return (
    <FinishScreen
      book={{ id: book.id, title: book.title, author: book.author, coverUrl: book.cover_url }}
      reading={{
        id: reading.id,
        startedAt: reading.started_at,
        finishedAt: reading.finished_at,
        rating: reading.rating,
        review: reading.review,
        takeaway: reading.summary,
      }}
      stats={stats}
      today={{ pages: today.pages, goal: dailyGoal }}
    />
  );
}
