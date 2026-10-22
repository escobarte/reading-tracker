import { notFound } from "next/navigation";
import { getBook } from "@/lib/db/books";
import { BookDetail } from "./BookDetail";

export default async function BookPage({ params }: PageProps<"/books/[id]">) {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) notFound();

  return <BookDetail book={book} />;
}
