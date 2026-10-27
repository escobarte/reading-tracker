"use server";

import { revalidatePath } from "next/cache";
import { reopenReading } from "@/lib/db/readings";
import {
  deleteSession,
  syncReadingCompletion,
  updateSession,
  type UpdateSessionInput,
} from "@/lib/db/sessions";

export type SessionMutationResult = { closedReading: boolean; needsRevertConfirm: boolean };

function revalidateBook(bookId: string) {
  revalidatePath(`/books/${bookId}`);
  revalidatePath(`/books/${bookId}/history`);
  revalidatePath("/library");
  revalidatePath("/");
}

export async function updateSessionAction(
  id: string,
  bookId: string,
  input: UpdateSessionInput,
): Promise<SessionMutationResult> {
  const session = await updateSession(id, input);
  const sync = await syncReadingCompletion(bookId, session.reading_id);
  revalidateBook(bookId);
  return { closedReading: sync.justFinished, needsRevertConfirm: sync.needsRevertConfirm };
}

export async function deleteSessionAction(
  id: string,
  bookId: string,
  readingId: string,
): Promise<SessionMutationResult> {
  await deleteSession(id);
  const sync = await syncReadingCompletion(bookId, readingId);
  revalidateBook(bookId);
  return { closedReading: sync.justFinished, needsRevertConfirm: sync.needsRevertConfirm };
}

export async function revertReadingAction(readingId: string, bookId: string): Promise<void> {
  await reopenReading(readingId, bookId);
  revalidateBook(bookId);
}
