import { notFound } from "next/navigation";
import { getBook } from "@/lib/db/books";
import { getLatestReading, listReadings } from "@/lib/db/readings";
import { getReadingStats, listAllSessions } from "@/lib/db/sessions";
import { HistoryPageView } from "./HistoryPageView";

export default async function BookHistoryPage({
  params,
  searchParams,
}: PageProps<"/books/[id]/history">) {
  const { id } = await params;
  const { reading: readingParam } = await searchParams;
  const requestedId = Array.isArray(readingParam) ? readingParam[0] : readingParam;

  const book = await getBook(id);
  if (!book) notFound();

  const readings = await listReadings(id);
  if (readings.length === 0) {
    return <HistoryPageView book={book} readings={[]} selectedReadingId={null} sessions={[]} stats={null} />;
  }

  const latest = await getLatestReading(id);
  const selected = readings.find((r) => r.id === requestedId) ?? latest ?? readings[readings.length - 1];

  const [sessions, stats] = await Promise.all([
    listAllSessions(selected.id),
    getReadingStats(selected.id),
  ]);

  return (
    <HistoryPageView
      book={book}
      readings={readings}
      selectedReadingId={selected.id}
      sessions={sessions}
      stats={stats}
    />
  );
}
