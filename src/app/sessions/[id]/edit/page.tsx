import { notFound } from "next/navigation";
import { getBook } from "@/lib/db/books";
import { getReading } from "@/lib/db/readings";
import { getSession } from "@/lib/db/sessions";
import { SessionEditForm } from "./SessionEditForm";

export default async function SessionEditPage({ params }: PageProps<"/sessions/[id]/edit">) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  const reading = await getReading(session.reading_id);
  if (!reading) notFound();

  const book = await getBook(reading.book_id);
  if (!book) notFound();

  return <SessionEditForm session={session} book={book} />;
}
