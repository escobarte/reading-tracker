"use server";

import { revalidatePath } from "next/cache";
import { saveReadingWrapup, type ReadingWrapupInput } from "@/lib/db/readings";
import { requireSignedIn } from "@/lib/require-user";

export async function saveReadingWrapupAction(bookId: string, readingId: string, input: ReadingWrapupInput) {
  await requireSignedIn();
  await saveReadingWrapup(readingId, input);
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/");
}
