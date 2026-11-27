"use server";

import { revalidatePath } from "next/cache";
import { moveShelf, reorderQueue } from "@/lib/db/books";
import type { BookShelf } from "@/lib/db/types";
import { requireSignedIn } from "@/lib/require-user";

export async function reorderQueueAction(orderedIds: string[]) {
  await requireSignedIn();
  await reorderQueue(orderedIds);
  revalidatePath("/library");
  revalidatePath("/");
}

export async function moveShelfAction(id: string, shelf: BookShelf) {
  await requireSignedIn();
  await moveShelf(id, shelf);
  revalidatePath("/library");
  revalidatePath(`/books/${id}`);
  revalidatePath("/");
}
