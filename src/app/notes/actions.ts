"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/get-current-user";
import { base64ToBytes } from "@/lib/base64";
import {
  createNote,
  createNoteWithPhoto,
  createPhotoNote,
  deleteNote,
  getBookPickerOptions,
  getNotePhotoUrl,
  getTagSuggestions,
  removeNotePhoto,
  replaceNotePhoto,
  setNoteFavorite,
  updateNote,
  type NoteBookOption,
  type NoteInput,
} from "@/lib/db/notes";
import type { Note, NoteType } from "@/lib/db/types";

export type { NoteBookOption };

const MAX_NOTE_LENGTH = 5000;

export type SaveNoteResult = { ok: true; note: Note } | { ok: false; error: "empty" | "too_long" };

function revalidateNotePaths(bookId: string | null) {
  revalidatePath("/notes");
  revalidatePath("/");
  if (bookId) revalidatePath(`/books/${bookId}`);
}

export async function getNoteEditorDataAction(): Promise<{
  books: NoteBookOption[];
  tagSuggestions: string[];
}> {
  const [books, tagSuggestions] = await Promise.all([getBookPickerOptions(), getTagSuggestions()]);
  return { books, tagSuggestions };
}

/** `hasPhoto`: у заметки уже есть фото — тогда пустой текст допустим (заметка остаётся при своём фото). */
function validateBody(input: NoteInput, hasPhoto: boolean): { error: "empty" | "too_long" } | null {
  const body = input.body.trim();
  if (!body && !hasPhoto) return { error: "empty" };
  if (body.length > MAX_NOTE_LENGTH) return { error: "too_long" };
  return null;
}

export async function createNoteAction(input: NoteInput): Promise<SaveNoteResult> {
  const invalid = validateBody(input, false);
  if (invalid) return { ok: false, error: invalid.error };

  const note = await createNote({ ...input, body: input.body.trim() });
  revalidateNotePaths(input.book_id);
  return { ok: true, note };
}

export async function updateNoteAction(id: string, input: NoteInput, hasPhoto = false): Promise<SaveNoteResult> {
  const invalid = validateBody(input, hasPhoto);
  if (invalid) return { ok: false, error: invalid.error };

  const body = input.body.trim();
  // Пустой текст у заметки с фото остаётся заметкой типа «фото», каким бы ни был выбран тип в Segmented.
  const type: NoteType = !body && hasPhoto ? "photo" : input.type;
  const note = await updateNote(id, { ...input, type, body });
  revalidateNotePaths(input.book_id);
  return { ok: true, note };
}

export async function deleteNoteAction(id: string, bookId: string | null): Promise<void> {
  await deleteNote(id);
  revalidateNotePaths(bookId);
}

export async function toggleNoteFavoriteAction(id: string, favorite: boolean, bookId: string | null): Promise<void> {
  await setNoteFavorite(id, favorite);
  revalidateNotePaths(bookId);
}

export type SavePhotoNoteResult = { ok: true; note: Note } | { ok: false; error: "unauthorized" | "failed" };

/** «Сохранить как фото»: заметка типа `photo` без текста. */
export async function createPhotoNoteAction(
  bookId: string,
  page: number | null,
  photoBase64: string,
): Promise<SavePhotoNoteResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  try {
    const note = await createPhotoNote({
      userId: user.id,
      book_id: bookId,
      page,
      photoBytes: base64ToBytes(photoBase64),
    });
    revalidateNotePaths(bookId);
    return { ok: true, note };
  } catch {
    return { ok: false, error: "failed" };
  }
}

/** Сохранение заметки из экрана результата распознавания: текст (может быть пустым) + фото страницы. */
export async function createNoteWithPhotoAction(
  bookId: string,
  type: NoteType,
  body: string,
  page: number | null,
  photoBase64: string,
): Promise<SavePhotoNoteResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  if (body.trim().length > MAX_NOTE_LENGTH) return { ok: false, error: "failed" };

  try {
    const note = await createNoteWithPhoto({
      userId: user.id,
      book_id: bookId,
      type,
      body,
      page,
      photoBytes: base64ToBytes(photoBase64),
    });
    revalidateNotePaths(bookId);
    return { ok: true, note };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export type PhotoActionResult = { ok: true } | { ok: false };

/** «Заменить» фото в правке заметки. */
export async function replaceNotePhotoAction(
  noteId: string,
  bookId: string | null,
  photoBase64: string,
): Promise<PhotoActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  try {
    await replaceNotePhoto(user.id, noteId, base64ToBytes(photoBase64));
    revalidateNotePaths(bookId);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** «Удалить фото» в правке заметки. */
export async function removeNotePhotoAction(noteId: string, bookId: string | null): Promise<PhotoActionResult> {
  try {
    await removeNotePhoto(noteId);
    revalidateNotePaths(bookId);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Свежая подписанная ссылка на фото заметки (после «Заменить», когда прежняя могла устареть). */
export async function getNotePhotoUrlAction(noteId: string): Promise<string | null> {
  return getNotePhotoUrl(noteId);
}
