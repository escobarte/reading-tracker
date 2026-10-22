import { notFound } from "next/navigation";
import { getBook } from "@/lib/db/books";
import { EditBookForm } from "./EditBookForm";

export default async function EditBookPage({ params }: PageProps<"/books/[id]/edit">) {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) notFound();

  return <EditBookForm book={book} />;
}
