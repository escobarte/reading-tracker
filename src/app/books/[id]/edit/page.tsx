import { notFound } from "next/navigation";
import { getBook } from "@/lib/db/books";
import { getGenreSuggestions } from "@/lib/db/stats";
import { EditBookForm } from "./EditBookForm";

export default async function EditBookPage({ params }: PageProps<"/books/[id]/edit">) {
  const { id } = await params;
  const [book, genreSuggestions] = await Promise.all([getBook(id), getGenreSuggestions()]);
  if (!book) notFound();

  return <EditBookForm book={book} genreSuggestions={genreSuggestions} />;
}
