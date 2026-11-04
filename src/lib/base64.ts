/** Декодирует base64 (без `data:` префикса) в байты — для серверной загрузки в Supabase Storage. */
export function base64ToBytes(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, "base64"));
}
