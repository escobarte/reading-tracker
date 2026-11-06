"use server";

import { revalidatePath } from "next/cache";
import { saveReadingWrapup, type ReadingWrapupInput } from "@/lib/db/readings";

export async function saveReadingWrapupAction(bookId: string, readingId: string, input: ReadingWrapupInput) {
  await saveReadingWrapup(readingId, input);
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/");
}
