"use server";

import { revalidatePath } from "next/cache";
import { getBook, moveShelf } from "@/lib/db/books";
import { ensureOpenReading } from "@/lib/db/readings";
import {
  createSession,
  getCurrentPage,
  getStreakDays,
  getTodaySummary,
  type CreateSessionInput,
} from "@/lib/db/sessions";
import type { Book } from "@/lib/db/types";

export async function getBookAction(id: string): Promise<Book | null> {
  return getBook(id);
}

export async function getTodayProgressAction(): Promise<{
  pages: number;
  minutes: number;
  sessionCount: number;
  streakDays: number;
}> {
  const [today, streakDays] = await Promise.all([getTodaySummary(), getStreakDays()]);
  return { ...today, streakDays };
}

/** Ставит книгу на полку «Читаю» (если нужно), гарантирует открытое прочтение, отдаёт его id и текущую страницу. */
export async function prepareSessionAction(
  bookId: string,
): Promise<{ readingId: string; startPage: number }> {
  const book = await getBook(bookId);
  if (!book) throw new Error("Book not found");

  if (book.shelf !== "reading") {
    await moveShelf(bookId, "reading");
  }

  const [reading, startPage] = await Promise.all([ensureOpenReading(bookId), getCurrentPage(bookId)]);

  revalidatePath(`/books/${bookId}`);
  revalidatePath("/library");

  return { readingId: reading.id, startPage };
}

export async function saveSessionAction(input: CreateSessionInput & { bookId: string }) {
  const { bookId, ...sessionInput } = input;
  await createSession(sessionInput);
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/library");
  revalidatePath("/");
}
