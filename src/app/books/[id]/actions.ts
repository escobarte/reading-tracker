"use server";

import { revalidatePath } from "next/cache";
import { deleteBook, moveShelf } from "@/lib/db/books";
import { continueLastReading } from "@/lib/db/readings";
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

/** "Продолжить это прочтение": reopens the book's last reading instead of starting a new one. */
export async function continueLastReadingAction(id: string) {
  await continueLastReading(id);
  revalidatePath("/library");
  revalidatePath(`/books/${id}`);
}
