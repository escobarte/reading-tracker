"use server";

import { revalidatePath } from "next/cache";
import { deleteBook, moveShelf } from "@/lib/db/books";
import type { BookShelf } from "@/lib/db/types";

export async function deleteBookAction(id: string) {
  await deleteBook(id);
  revalidatePath("/library");
}

export async function moveShelfAction(id: string, shelf: BookShelf) {
  await moveShelf(id, shelf);
  revalidatePath("/library");
  revalidatePath(`/books/${id}`);
}
