// Схема собственного PostgreSQL (вариант C из MIGRATION_AUDIT.md).
// Эталон — реальная схема Supabase из бэкапа: имена таблиц, колонок, индексов
// и ограничений сохранены. Не перенесены: auth.uid(), RLS, роль authenticated, storage.
// Фильтр по user_id теперь обязан делать код приложения.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamptz } from "./timestamptz";

// Пользователи -----------------------------------------------------------------
// Базовая модель "user" из Better Auth. Имена свойств — как у Better Auth,
// имена колонок — snake_case. id имеет тип uuid, поэтому в конфиге Better Auth
// нужно `advanced: { database: { generateId: "uuid" } }`.
// Не путать: session — вход в приложение, sessions — сессии чтения.

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Служебные колонки таблиц Better Auth (по умолчанию он пишет и читает даты как Date).
const authDate = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => authDate("created_at").notNull().defaultNow();
const updatedAt = () =>
  authDate("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** Открытые входы в приложение. */
export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: authDate("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "session_user_id_fkey",
      columns: [t.userId],
      foreignColumns: [user.id],
    }).onDelete("cascade"),
    index("session_user_id").on(t.userId),
  ],
);

/** Способы входа пользователя: `credential` (хеш пароля) и `google`. */
export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    providerId: text("provider_id").notNull(),
    accountId: text("account_id").notNull(),
    password: text("password"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: authDate("access_token_expires_at"),
    refreshTokenExpiresAt: authDate("refresh_token_expires_at"),
    scope: text("scope"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "account_user_id_fkey",
      columns: [t.userId],
      foreignColumns: [user.id],
    }).onDelete("cascade"),
    index("account_user_id").on(t.userId),
  ],
);

/** Одноразовые значения входа, например состояние перехода к Google. */
export const verification = pgTable(
  "verification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: authDate("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier").on(t.identifier)],
);

const ownerId = () => uuid("user_id").notNull();

// Данные приложения ------------------------------------------------------------

export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: ownerId(),
    created_at: timestamptz("created_at").notNull().default(sql`now()`),
    title: text("title").notNull(),
    author: text("author"),
    cover_url: text("cover_url"),
    total_pages: integer("total_pages"),
    format: text("format", { enum: ["paper", "ebook"] })
      .notNull()
      .default("paper"),
    shelf: text("shelf", {
      enum: ["want", "reading", "done", "paused", "dropped", "collection"],
    })
      .notNull()
      .default("want"),
    queue_position: integer("queue_position"),
    series: text("series"),
    series_number: numeric("series_number", { mode: "number" }),
    genre: text("genre"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    google_books_id: text("google_books_id"),
    isbn: text("isbn"),
    language: text("language"),
  },
  (t) => [
    foreignKey({
      name: "books_user_id_fkey",
      columns: [t.user_id],
      foreignColumns: [user.id],
    }).onDelete("cascade"),
    check("books_format_check", sql`${t.format} in ('paper', 'ebook')`),
    check(
      "books_shelf_check",
      sql`${t.shelf} in ('want', 'reading', 'done', 'paused', 'dropped', 'collection')`,
    ),
    check("books_total_pages_check", sql`${t.total_pages} > 0`),
    index("books_user_id").on(t.user_id),
    index("books_user_shelf_queue").on(t.user_id, t.shelf, t.queue_position),
  ],
);

export const readings = pgTable(
  "readings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: ownerId(),
    created_at: timestamptz("created_at").notNull().default(sql`now()`),
    book_id: uuid("book_id").notNull(),
    started_at: timestamptz("started_at"),
    finished_at: timestamptz("finished_at"),
    rating: integer("rating"),
    summary: text("summary"),
    pause_reason: text("pause_reason"),
    review: text("review"),
    pause_note: text("pause_note"),
    stopped_at: timestamptz("stopped_at"),
    is_dropped: boolean("is_dropped").notNull().default(false),
  },
  (t) => [
    foreignKey({
      name: "readings_user_id_fkey",
      columns: [t.user_id],
      foreignColumns: [user.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "readings_book_id_fkey",
      columns: [t.book_id],
      foreignColumns: [books.id],
    }).onDelete("cascade"),
    check(
      "readings_pause_note_check",
      sql`${t.pause_note} is null or char_length(${t.pause_note}) <= 1000`,
    ),
    check(
      "readings_rating_check",
      sql`${t.rating} is null or (${t.rating} >= 1 and ${t.rating} <= 5)`,
    ),
    index("readings_user_id").on(t.user_id),
    // Новый индекс, в Supabase его не было.
    index("readings_book_id").on(t.book_id),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: ownerId(),
    created_at: timestamptz("created_at").notNull().default(sql`now()`),
    reading_id: uuid("reading_id").notNull(),
    started_at: timestamptz("started_at").notNull(),
    ended_at: timestamptz("ended_at"),
    page_from: integer("page_from"),
    page_to: integer("page_to"),
    pages_read: integer("pages_read"),
    seconds: integer("seconds"),
    source: text("source", { enum: ["timer", "manual"] })
      .notNull()
      .default("timer"),
  },
  (t) => [
    foreignKey({
      name: "sessions_user_id_fkey",
      columns: [t.user_id],
      foreignColumns: [user.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "sessions_reading_id_fkey",
      columns: [t.reading_id],
      foreignColumns: [readings.id],
    }).onDelete("cascade"),
    check("sessions_source_check", sql`${t.source} in ('timer', 'manual')`),
    index("sessions_user_id").on(t.user_id),
    index("sessions_user_started_at").on(t.user_id, t.started_at),
    index("sessions_reading_id").on(t.reading_id),
  ],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: ownerId(),
    created_at: timestamptz("created_at").notNull().default(sql`now()`),
    book_id: uuid("book_id"),
    type: text("type", { enum: ["quote", "thought", "word", "photo"] }),
    body: text("body"),
    meaning: text("meaning"),
    page: integer("page"),
    photo_path: text("photo_path"),
    is_favorite: boolean("is_favorite").notNull().default(false),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  },
  (t) => [
    foreignKey({
      name: "notes_user_id_fkey",
      columns: [t.user_id],
      foreignColumns: [user.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "notes_book_id_fkey",
      columns: [t.book_id],
      foreignColumns: [books.id],
    }).onDelete("cascade"),
    check("notes_type_check", sql`${t.type} in ('quote', 'thought', 'word', 'photo')`),
    index("notes_user_id").on(t.user_id),
    index("notes_book_id").on(t.book_id),
  ],
);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: ownerId(),
    created_at: timestamptz("created_at").notNull().default(sql`now()`),
    kind: text("kind", { enum: ["yearly", "daily", "deadline"] }),
    target_value: integer("target_value"),
    year: integer("year"),
    reading_id: uuid("reading_id"),
    due_date: date("due_date"),
    skip_weekdays: integer("skip_weekdays").array().notNull().default(sql`'{}'::integer[]`),
  },
  (t) => [
    foreignKey({
      name: "goals_user_id_fkey",
      columns: [t.user_id],
      foreignColumns: [user.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "goals_reading_id_fkey",
      columns: [t.reading_id],
      foreignColumns: [readings.id],
    }).onDelete("cascade"),
    check("goals_kind_check", sql`${t.kind} in ('yearly', 'daily', 'deadline')`),
    index("goals_user_id").on(t.user_id),
    uniqueIndex("goals_one_yearly_per_year")
      .on(t.user_id, t.year)
      .where(sql`${t.kind} = 'yearly'`),
    uniqueIndex("goals_one_daily_per_user")
      .on(t.user_id)
      .where(sql`${t.kind} = 'daily'`),
    uniqueIndex("goals_one_deadline_per_reading")
      .on(t.user_id, t.reading_id)
      .where(sql`${t.kind} = 'deadline'`),
  ],
);

export const settings = pgTable(
  "settings",
  {
    user_id: uuid("user_id").primaryKey(),
    language: text("language", { enum: ["ru", "en"] })
      .notNull()
      .default("ru"),
    theme: text("theme", { enum: ["light", "dark"] })
      .notNull()
      .default("light"),
    reminder_time: time("reminder_time"),
    updated_at: timestamptz("updated_at").notNull().default(sql`now()`),
  },
  (t) => [
    foreignKey({
      name: "settings_user_id_fkey",
      columns: [t.user_id],
      foreignColumns: [user.id],
    }).onDelete("cascade"),
    check("settings_language_check", sql`${t.language} in ('ru', 'en')`),
    check("settings_theme_check", sql`${t.theme} in ('light', 'dark')`),
  ],
);

export const ocrUsage = pgTable(
  "ocr_usage",
  {
    user_id: ownerId(),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [
    primaryKey({ name: "ocr_usage_pkey", columns: [t.user_id, t.day] }),
    foreignKey({
      name: "ocr_usage_user_id_fkey",
      columns: [t.user_id],
      foreignColumns: [user.id],
    }).onDelete("cascade"),
  ],
);
