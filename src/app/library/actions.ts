"use server";

import { revalidatePath } from "next/cache";
import { moveShelf, reorderQueue } from "@/lib/db/books";
import type { BookShelf } from "@/lib/db/types";

export async function reorderQueueAction(orderedIds: string[]) {
  await reorderQueue(orderedIds);
  revalidatePath("/library");
  revalidatePath("/");
}

export async function moveShelfAction(id: string, shelf: BookShelf) {
  await moveShelf(id, shelf);
  revalidatePath("/library");
  revalidatePath(`/books/${id}`);
  revalidatePath("/");
}
