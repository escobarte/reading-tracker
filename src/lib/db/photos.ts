import { createClient } from "@/lib/supabase/server";
import { PHOTO_STORAGE_BUCKET } from "@/lib/config";

/** Путь объекта в бакете `note-photos` для фото заметки: `{user_id}/{note_id}.jpg` (всегда JPEG). */
export function notePhotoPath(userId: string, noteId: string): string {
  return `${userId}/${noteId}.jpg`;
}

export async function uploadNotePhoto(path: string, bytes: Uint8Array): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(PHOTO_STORAGE_BUCKET).upload(path, bytes, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
}

export async function deleteNotePhoto(path: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(PHOTO_STORAGE_BUCKET).remove([path]);
  if (error) throw error;
}

export async function getSignedPhotoUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(PHOTO_STORAGE_BUCKET).createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Подписанные ссылки на несколько фото сразу (список заметок) — один запрос к Storage. */
export async function getSignedPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(PHOTO_STORAGE_BUCKET).createSignedUrls(unique, 3600);
  if (error) throw error;
  const map = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) map.set(item.path, item.signedUrl);
  }
  return map;
}
