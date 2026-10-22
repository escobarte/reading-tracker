import { listBooks } from "@/lib/db/books";
import { LibraryView } from "./LibraryView";

export default async function LibraryPage() {
  const books = await listBooks();
  return <LibraryView initialBooks={books} />;
}
