import { notFound } from "next/navigation";
import { getBook } from "@/lib/db/books";
import { getLatestReading } from "@/lib/db/readings";
import { getCurrentPage, getReadingStats, listRecentSessions } from "@/lib/db/sessions";
import { BookDetail } from "./BookDetail";

export default async function BookPage({ params }: PageProps<"/books/[id]">) {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) notFound();

  const reading = await getLatestReading(id);
  const [currentPage, stats, sessions] = await Promise.all([
    getCurrentPage(id),
    reading ? getReadingStats(reading.id) : Promise.resolve(null),
    reading ? listRecentSessions(reading.id, 5) : Promise.resolve([]),
  ]);

  return <BookDetail book={book} currentPage={currentPage} stats={stats} sessions={sessions} />;
}
