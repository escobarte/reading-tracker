"use server";

import { revalidatePath } from "next/cache";
import { reopenReading } from "@/lib/db/readings";
import {
  deleteSessionAndSync,
  updateSessionAndSync,
  type UpdateSessionInput,
} from "@/lib/db/sessions";
import { requireSignedIn } from "@/lib/require-user";

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
  await requireSignedIn();
  const sync = await updateSessionAndSync(id, bookId, input);
  revalidateBook(bookId);
  return { closedReading: sync.justFinished, needsRevertConfirm: sync.needsRevertConfirm };
}

export async function deleteSessionAction(
  id: string,
  bookId: string,
  readingId: string,
): Promise<SessionMutationResult> {
  await requireSignedIn();
  const sync = await deleteSessionAndSync(id, bookId, readingId);
  revalidateBook(bookId);
  return { closedReading: sync.justFinished, needsRevertConfirm: sync.needsRevertConfirm };
}

export async function revertReadingAction(readingId: string, bookId: string): Promise<void> {
  await requireSignedIn();
  await reopenReading(readingId, bookId);
  revalidateBook(bookId);
}
