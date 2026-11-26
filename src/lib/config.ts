/** Фото заметки больше этого размера сервер не сохраняет. Лимит тела Server Action — в next.config.ts. */
export const NOTE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** Сколько распознаваний текста по фото разрешено одному пользователю в день (Europe/Bucharest). */
export const OCR_DAILY_LIMIT = 30;

/** Сервер отклоняет изображение для распознавания больше этого размера. */
export const OCR_MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
