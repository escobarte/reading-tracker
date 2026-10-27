"use server";

import { revalidatePath } from "next/cache";
import { deleteBook, moveShelf } from "@/lib/db/books";
import { deleteDeadlineGoal, saveDeadlineGoal } from "@/lib/db/goals";
import { continueLastReading } from "@/lib/db/readings";
import type { BookShelf } from "@/lib/db/types";

export async function deleteBookAction(id: string) {
  await deleteBook(id);
  revalidatePath("/library");
  revalidatePath("/");
}

export async function moveShelfAction(id: string, shelf: BookShelf) {
  await moveShelf(id, shelf);
  revalidatePath("/library");
  revalidatePath(`/books/${id}`);
  revalidatePath("/");
}

/** "Продолжить это прочтение": reopens the book's last reading instead of starting a new one. */
export async function continueLastReadingAction(id: string) {
  await continueLastReading(id);
  revalidatePath("/library");
  revalidatePath(`/books/${id}`);
  revalidatePath("/");
}

export async function saveDeadlineAction(
  bookId: string,
  readingId: string,
  dueDate: string,
  skipWeekdays: number[],
) {
  await saveDeadlineGoal(readingId, dueDate, skipWeekdays);
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/");
}

export async function removeDeadlineAction(bookId: string, readingId: string) {
  await deleteDeadlineGoal(readingId);
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/");
}
