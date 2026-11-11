export type BookFormat = "paper" | "ebook";
export type BookShelf = "want" | "reading" | "done" | "paused" | "dropped";

export type Book = {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  total_pages: number | null;
  format: BookFormat;
  shelf: BookShelf;
  queue_position: number | null;
  series: string | null;
  series_number: number | null;
  genre: string | null;
  tags: string[];
  google_books_id: string | null;
  isbn: string | null;
  language: string | null;
};

export type Reading = {
  id: string;
  user_id: string;
  created_at: string;
  book_id: string;
  started_at: string | null;
  finished_at: string | null;
  rating: number | null;
  /** «Что я понял» — итог прочтения. */
  summary: string | null;
  review: string | null;
  /** Код причины паузы/отказа (`pause_*` или `drop_*`, или `other`). */
  pause_reason: string | null;
  pause_note: string | null;
  stopped_at: string | null;
  /** true только для прочтений, закрытых отказом — такие не считаются прочитанными книгами. */
  is_dropped: boolean;
};

export type SessionSource = "timer" | "manual";

export type ReadingSession = {
  id: string;
  user_id: string;
  created_at: string;
  reading_id: string;
  started_at: string;
  ended_at: string | null;
  page_from: number | null;
  page_to: number | null;
  pages_read: number | null;
  seconds: number | null;
  source: SessionSource;
};

export type NoteType = "quote" | "thought" | "word" | "photo";

export type Note = {
  id: string;
  user_id: string;
  created_at: string;
  book_id: string | null;
  type: NoteType;
  body: string | null;
  meaning: string | null;
  page: number | null;
  photo_path: string | null;
  is_favorite: boolean;
  tags: string[];
};

export type GoalKind = "yearly" | "daily" | "deadline";

export type Goal = {
  id: string;
  user_id: string;
  created_at: string;
  kind: GoalKind;
  target_value: number | null;
  year: number | null;
  reading_id: string | null;
  due_date: string | null;
  skip_weekdays: number[];
};

export type SettingsLanguage = "ru" | "en";
export type SettingsTheme = "light" | "dark";

export type UserSettings = {
  user_id: string;
  language: SettingsLanguage;
  theme: SettingsTheme;
  reminder_time: string | null;
  updated_at: string;
};
