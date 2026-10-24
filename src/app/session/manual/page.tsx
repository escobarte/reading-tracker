import { notFound } from "next/navigation";
import { getBook } from "@/lib/db/books";
import { getCurrentPage } from "@/lib/db/sessions";
import { ManualEntryView } from "./ManualEntryView";

export default async function SessionManualPage({
  searchParams,
}: PageProps<"/session/manual">) {
  const { book: bookId } = await searchParams;
  const id = Array.isArray(bookId) ? bookId[0] : bookId;
  if (!id) notFound();

  const book = await getBook(id);
  if (!book) notFound();

  const currentPage = await getCurrentPage(id);

  return <ManualEntryView book={book} currentPage={currentPage} />;
}
