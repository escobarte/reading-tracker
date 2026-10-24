import { listBooks } from "@/lib/db/books";
import { SessionView } from "./SessionView";

export default async function SessionPage() {
  const books = await listBooks();
  const readingBooks = books.filter((book) => book.shelf === "reading");
  const queueBooks = books
    .filter((book) => book.shelf === "want")
    .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0))
    .slice(0, 3);

  return <SessionView books={books} readingBooks={readingBooks} queueBooks={queueBooks} />;
}
