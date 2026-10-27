"use server";

import { revalidatePath } from "next/cache";
import { getBook, moveShelf } from "@/lib/db/books";
import { getDailyPagesGoal } from "@/lib/db/goals";
import { ensureOpenReading } from "@/lib/db/readings";
import {
  createSession,
  getCurrentPage,
  getStreakDays,
  getTodaySummary,
  syncReadingCompletion,
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
  goal: number;
}> {
  const [today, streakDays, goal] = await Promise.all([getTodaySummary(), getStreakDays(), getDailyPagesGoal()]);
  return { ...today, streakDays, goal };
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
  revalidatePath("/");

  return { readingId: reading.id, startPage };
}

export async function saveSessionAction(
  input: CreateSessionInput & { bookId: string },
): Promise<{ closedReading: boolean }> {
  const { bookId, ...sessionInput } = input;
  const session = await createSession(sessionInput);
  const sync = await syncReadingCompletion(bookId, session.reading_id);
  revalidatePath(`/books/${bookId}`);
  revalidatePath(`/books/${bookId}/history`);
  revalidatePath("/library");
  revalidatePath("/");
  return { closedReading: sync.justFinished };
}
