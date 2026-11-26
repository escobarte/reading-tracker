// Файлы фото на диске сервера: PHOTOS_DIR/{user_id}/{note_id}.jpg. Только для сервера.
// Владельца здесь не проверяют: вызывающий берёт путь из своей заметки (notes.ts).
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { NOTE_PHOTO_MAX_BYTES } from "@/lib/config";

/** Путь фото заметки внутри `PHOTOS_DIR` (он же `notes.photo_path`): `{user_id}/{note_id}.jpg`, всегда JPEG. */
export function notePhotoPath(userId: string, noteId: string): string {
  return `${userId}/${noteId}.jpg`;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PHOTO_PATH = new RegExp(`^${UUID}/${UUID}\\.jpg$`);

/** Файл на диске. `null`, если путь не того вида: так за пределы `PHOTOS_DIR` не выйти. */
function photoFile(photoPath: string): string | null {
  const root = process.env.PHOTOS_DIR;
  if (!root) throw new Error("PHOTOS_DIR is not set");
  return PHOTO_PATH.test(photoPath) ? path.join(/*turbopackIgnore: true*/ root, photoPath) : null;
}

function isMissingFile(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

/** JPEG начинается с байтов FF D8 FF. */
function isJpeg(bytes: Uint8Array): boolean {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/** Сохраняет или заменяет фото. Принимает только JPEG не больше `NOTE_PHOTO_MAX_BYTES`. */
export async function writeNotePhoto(photoPath: string, bytes: Uint8Array): Promise<void> {
  try {
    if (bytes.length > NOTE_PHOTO_MAX_BYTES) throw new Error("Photo is too large");
    if (!isJpeg(bytes)) throw new Error("Photo is not a JPEG");
    const file = photoFile(photoPath);
    if (!file) throw new Error("Invalid photo path");

    await mkdir(path.dirname(file), { recursive: true });
    // Через временный файл: при сбое посередине прежнее фото остаётся целым.
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, bytes, { flag: "wx" });
      await rename(temporary, file);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
  } catch (error) {
    // Действия показывают пользователю общее «не получилось», причина остаётся только в журнале.
    console.error("[photos] write failed:", error instanceof Error ? error.message : error);
    throw error;
  }
}

/** Содержимое фото или `null`, если файла нет. */
export async function readNotePhoto(photoPath: string): Promise<Buffer<ArrayBuffer> | null> {
  const file = photoFile(photoPath);
  if (!file) return null;
  try {
    return await readFile(file);
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

/** Отсутствующий файл не считается ошибкой. */
export async function deleteNotePhoto(photoPath: string): Promise<void> {
  const file = photoFile(photoPath);
  if (file) await rm(file, { force: true });
}

/** Адрес фото заметки в приложении (отдаёт `/api/photos/[noteId]` только владельцу). */
export function notePhotoUrl(noteId: string): string {
  return `/api/photos/${noteId}`;
}

/**
 * Адрес с версией файла (время изменения): после «Заменить» он меняется, и браузер не берёт
 * старое фото из кэша. `null`, если файла нет: тогда вместо картинки рисуется заглушка.
 */
export async function versionedPhotoUrl(noteId: string, photoPath: string): Promise<string | null> {
  const file = photoFile(photoPath);
  if (!file) return null;
  try {
    const { mtimeMs } = await stat(file);
    return `${notePhotoUrl(noteId)}?v=${Math.trunc(mtimeMs)}`;
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}
