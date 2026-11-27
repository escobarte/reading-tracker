"use server";

import { revalidatePath } from "next/cache";
import { updateBook, type BookInput } from "@/lib/db/books";
import { requireSignedIn } from "@/lib/require-user";

export async function updateBookAction(id: string, input: Partial<BookInput>) {
  await requireSignedIn();
  await updateBook(id, input);
  revalidatePath("/library");
  revalidatePath(`/books/${id}`);
}
