export type BookFormat = "paper" | "ebook";
export type BookShelf = "want" | "reading" | "done" | "paused";

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
  summary: string | null;
  pause_reason: string | null;
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
  book_id: string;
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
  rest_days: number;
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
