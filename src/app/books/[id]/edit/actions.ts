"use server";

import { revalidatePath } from "next/cache";
import { updateBook, type BookInput } from "@/lib/db/books";

export async function updateBookAction(id: string, input: Partial<BookInput>) {
  await updateBook(id, input);
  revalidatePath("/library");
  revalidatePath(`/books/${id}`);
}
