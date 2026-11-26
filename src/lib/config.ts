/** Фото заметки больше этого размера сервер не сохраняет. Лимит тела Server Action — в next.config.ts. */
export const NOTE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** Сколько распознаваний текста по фото разрешено одному пользователю в день (Europe/Bucharest). */
export const OCR_DAILY_LIMIT = 30;

/** Сервер отклоняет изображение для распознавания больше этого размера. */
export const OCR_MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/** Сколько попыток входа по паролю разрешено за окно; удачный вход счётчик обнуляет. */
export const LOGIN_MAX_ATTEMPTS = 10;
export const LOGIN_WINDOW_MINUTES = 15;
