"use server";

import { revalidatePath } from "next/cache";
import { createBook, findDuplicateBook, type BookInput } from "@/lib/db/books";

export type AddBookResult =
  | { ok: true; id: string }
  | { ok: false; reason: "duplicate"; existingId: string; existingTitle: string }
  | { ok: false; reason: "error"; message: string };

export async function addBookAction(input: BookInput): Promise<AddBookResult> {
  if (!input.title.trim()) {
    return { ok: false, reason: "error", message: "title_required" };
  }

  try {
    const duplicate = await findDuplicateBook({
      google_books_id: input.google_books_id,
      title: input.title,
      author: input.author,
    });
    if (duplicate) {
      return { ok: false, reason: "duplicate", existingId: duplicate.id, existingTitle: duplicate.title };
    }

    const book = await createBook(input);
    revalidatePath("/library");
    return { ok: true, id: book.id };
  } catch {
    return { ok: false, reason: "error", message: "unknown" };
  }
}
