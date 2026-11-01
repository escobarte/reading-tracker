"use server";

import { revalidatePath } from "next/cache";
import {
  createNote,
  deleteNote,
  getBookPickerOptions,
  getLatestReadingBookId,
  getTagSuggestions,
  setNoteFavorite,
  updateNote,
  type NoteBookOption,
  type NoteInput,
} from "@/lib/db/notes";
import type { Note } from "@/lib/db/types";

export type { NoteBookOption };

const MAX_NOTE_LENGTH = 5000;

export type SaveNoteResult = { ok: true; note: Note } | { ok: false; error: "empty" | "too_long" };

function revalidateNotePaths(bookId: string) {
  revalidatePath("/notes");
  revalidatePath("/");
  revalidatePath(`/books/${bookId}`);
}

export async function getNoteEditorDataAction(): Promise<{
  books: NoteBookOption[];
  defaultBookId: string | null;
  tagSuggestions: string[];
}> {
  const [books, defaultBookId, tagSuggestions] = await Promise.all([
    getBookPickerOptions(),
    getLatestReadingBookId(),
    getTagSuggestions(),
  ]);
  return { books, defaultBookId, tagSuggestions };
}

function validateBody(input: NoteInput): { error: "empty" | "too_long" } | null {
  const body = input.body.trim();
  if (!body) return { error: "empty" };
  if (body.length > MAX_NOTE_LENGTH) return { error: "too_long" };
  return null;
}

export async function createNoteAction(input: NoteInput): Promise<SaveNoteResult> {
  const invalid = validateBody(input);
  if (invalid) return { ok: false, error: invalid.error };

  const note = await createNote({ ...input, body: input.body.trim() });
  revalidateNotePaths(input.book_id);
  return { ok: true, note };
}

export async function updateNoteAction(id: string, input: NoteInput): Promise<SaveNoteResult> {
  const invalid = validateBody(input);
  if (invalid) return { ok: false, error: invalid.error };

  const note = await updateNote(id, { ...input, body: input.body.trim() });
  revalidateNotePaths(input.book_id);
  return { ok: true, note };
}

export async function deleteNoteAction(id: string, bookId: string): Promise<void> {
  await deleteNote(id);
  revalidateNotePaths(bookId);
}

export async function toggleNoteFavoriteAction(id: string, favorite: boolean, bookId: string): Promise<void> {
  await setNoteFavorite(id, favorite);
  revalidateNotePaths(bookId);
}
