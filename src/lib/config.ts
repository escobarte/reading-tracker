/** Бакет Supabase Storage для фото страниц (миграция 0003). */
export const PHOTO_STORAGE_BUCKET = "note-photos";

/** Сколько распознаваний текста по фото разрешено одному пользователю в день (Europe/Bucharest). */
export const OCR_DAILY_LIMIT = 30;

/** Сервер отклоняет изображение для распознавания больше этого размера. */
export const OCR_MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
