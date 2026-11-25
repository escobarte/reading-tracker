import { and, desc, eq, ilike, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { books, readings } from "@/db/schema";
import { requireUserId } from "@/lib/require-user";
import { localYear } from "@/lib/time";
import { assertOwnBook, firstOrThrow } from "./query";
import type { Book, BookFormat, BookShelf } from "./types";

export type BookInput = {
  title: string;
  author?: string | null;
  cover_url?: string | null;
  total_pages?: number | null;
  format?: BookFormat;
  shelf?: BookShelf;
  series?: string | null;
  series_number?: number | null;
  genre?: string | null;
  tags?: string[];
  google_books_id?: string | null;
  isbn?: string | null;
  language?: string | null;
};

/** Книга по id, только своя. */
function ownBook(userId: string, id: string) {
  return and(eq(books.id, id), eq(books.user_id, userId));
}

const queueOrder = sql`${books.queue_position} asc nulls last`;

export async function listBooks(): Promise<Book[]> {
  const userId = await requireUserId();
  return getDb()
    .select()
    .from(books)
    .where(eq(books.user_id, userId))
    .orderBy(queueOrder, desc(books.created_at));
}

export async function getBook(id: string): Promise<Book | null> {
  const userId = await requireUserId();
  const [book] = await getDb().select().from(books).where(ownBook(userId, id));
  return book ?? null;
}

export async function findDuplicateBook(input: {
  google_books_id?: string | null;
  title: string;
  author?: string | null;
}): Promise<Book | null> {
  const userId = await requireUserId();
  const db = getDb();

  if (input.google_books_id) {
    const [book] = await db
      .select()
      .from(books)
      .where(and(eq(books.user_id, userId), eq(books.google_books_id, input.google_books_id)))
      .limit(1);
    if (book) return book;
  }

  const candidates = await db
    .select()
    .from(books)
    .where(and(eq(books.user_id, userId), ilike(books.title, input.title.trim())));

  const author = (input.author ?? "").trim().toLowerCase();
  const match = candidates.find((book) => (book.author ?? "").trim().toLowerCase() === author);
  return match ?? null;
}

async function nextQueuePosition(userId: string): Promise<number> {
  const [last] = await getDb()
    .select({ queue_position: books.queue_position })
    .from(books)
    .where(and(eq(books.user_id, userId), eq(books.shelf, "want")))
    .orderBy(desc(books.queue_position))
    .limit(1);
  return (last?.queue_position ?? 0) + 1;
}

async function renumberQueue(userId: string): Promise<void> {
  const db = getDb();
  const queue = await db
    .select({ id: books.id, queue_position: books.queue_position })
    .from(books)
    .where(and(eq(books.user_id, userId), eq(books.shelf, "want")))
    .orderBy(queueOrder);

  const updates = queue
    .map((book, index) => ({ id: book.id, position: index + 1, changed: book.queue_position !== index + 1 }))
    .filter((entry) => entry.changed);

  await Promise.all(
    updates.map((entry) =>
      db.update(books).set({ queue_position: entry.position }).where(ownBook(userId, entry.id)),
    ),
  );
}

export async function createBook(input: BookInput): Promise<Book> {
  const userId = await requireUserId();
  const db = getDb();
  const shelf = input.shelf ?? "want";

  const queue_position = shelf === "want" ? await nextQueuePosition(userId) : null;

  const book = firstOrThrow(
    await db
      .insert(books)
      .values({
        user_id: userId,
        title: input.title.trim(),
        author: input.author?.trim() || null,
        cover_url: input.cover_url || null,
        total_pages: input.total_pages ?? null,
        format: input.format ?? "paper",
        shelf,
        queue_position,
        series: input.series || null,
        series_number: input.series_number ?? null,
        genre: input.genre || null,
        tags: input.tags ?? [],
        google_books_id: input.google_books_id || null,
        isbn: input.isbn || null,
        language: input.language || null,
      })
      .returning(),
  );

  if (shelf === "reading") {
    await db
      .insert(readings)
      .values({ user_id: userId, book_id: book.id, started_at: new Date().toISOString() });
  }

  return book;
}

export async function updateBook(id: string, input: Partial<BookInput>): Promise<Book> {
  const userId = await requireUserId();
  const patch: Partial<typeof books.$inferInsert> = {};

  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.author !== undefined) patch.author = input.author?.trim() || null;
  if (input.cover_url !== undefined) patch.cover_url = input.cover_url || null;
  if (input.total_pages !== undefined) patch.total_pages = input.total_pages;
  if (input.format !== undefined) patch.format = input.format;
  if (input.series !== undefined) patch.series = input.series || null;
  if (input.series_number !== undefined) patch.series_number = input.series_number;
  if (input.genre !== undefined) patch.genre = input.genre || null;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.isbn !== undefined) patch.isbn = input.isbn || null;
  if (input.language !== undefined) patch.language = input.language || null;

  return firstOrThrow(await getDb().update(books).set(patch).where(ownBook(userId, id)).returning());
}

export async function deleteBook(id: string): Promise<void> {
  const userId = await requireUserId();
  await getDb().delete(books).where(ownBook(userId, id));
  await renumberQueue(userId);
}

export async function reorderQueue(orderedIds: string[]): Promise<void> {
  const userId = await requireUserId();
  const db = getDb();
  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(books).set({ queue_position: index + 1 }).where(ownBook(userId, id)),
    ),
  );
}

/** Sets the shelf directly, without touching readings. Used where reading state is managed separately. */
export async function setShelf(id: string, shelf: BookShelf): Promise<void> {
  const userId = await requireUserId();
  const queue_position = shelf === "want" ? await nextQueuePosition(userId) : null;
  await getDb().update(books).set({ shelf, queue_position }).where(ownBook(userId, id));
  if (shelf !== "want") await renumberQueue(userId);
}

/** id открытого прочтения книги (начатого последним) или `null`. */
async function findOpenReadingId(userId: string, bookId: string): Promise<string | null> {
  const [reading] = await getDb()
    .select({ id: readings.id })
    .from(readings)
    .where(and(eq(readings.user_id, userId), eq(readings.book_id, bookId), isNull(readings.finished_at)))
    .orderBy(desc(readings.started_at))
    .limit(1);
  return reading?.id ?? null;
}

function ownReading(userId: string, id: string) {
  return and(eq(readings.id, id), eq(readings.user_id, userId));
}

/** Закрывает открытое прочтение без зачёта (is_dropped), если оно есть — книга переходит на полку без сохранённого прогресса чтения. */
async function closeOpenReadingWithoutCredit(userId: string, bookId: string): Promise<void> {
  const openReadingId = await findOpenReadingId(userId, bookId);

  if (openReadingId) {
    await getDb()
      .update(readings)
      .set({ finished_at: new Date().toISOString(), is_dropped: true })
      .where(ownReading(userId, openReadingId));
  }
}

export async function moveShelf(id: string, shelf: BookShelf): Promise<void> {
  const userId = await requireUserId();
  const db = getDb();

  if (shelf === "want") {
    await closeOpenReadingWithoutCredit(userId, id);

    const queue_position = await nextQueuePosition(userId);
    await db.update(books).set({ shelf, queue_position }).where(ownBook(userId, id));
    return;
  }

  if (shelf === "collection") {
    await closeOpenReadingWithoutCredit(userId, id);

    await db.update(books).set({ shelf, queue_position: null }).where(ownBook(userId, id));
    await renumberQueue(userId);
    return;
  }

  if (shelf === "reading") {
    const openReadingId = await findOpenReadingId(userId, id);

    if (!openReadingId) {
      await assertOwnBook(userId, id);
      await db.insert(readings).values({ user_id: userId, book_id: id, started_at: new Date().toISOString() });
    }

    await db.update(books).set({ shelf, queue_position: null }).where(ownBook(userId, id));
    await renumberQueue(userId);
    return;
  }

  if (shelf === "done") {
    const openReadingId = await findOpenReadingId(userId, id);

    const now = new Date().toISOString();
    if (openReadingId) {
      await db.update(readings).set({ finished_at: now }).where(ownReading(userId, openReadingId));
    } else {
      await assertOwnBook(userId, id);
      await db.insert(readings).values({ user_id: userId, book_id: id, started_at: now, finished_at: now });
    }

    await db.update(books).set({ shelf, queue_position: null }).where(ownBook(userId, id));
    await renumberQueue(userId);
    return;
  }

  // paused / dropped without a reason — the usual paths go through pauseReading/dropReading instead,
  // which also set the reason and close/keep the reading; this is a plain shelf move.
  await db.update(books).set({ shelf, queue_position: null }).where(ownBook(userId, id));
  await renumberQueue(userId);
}

export type YearPlanBook = { id: string; title: string; totalPages: number | null; read: boolean };
export type YearPlan = {
  books: YearPlanBook[];
  totalPages: number;
  readingCount: number;
  wantCount: number;
  finishedCount: number;
};

/**
 * Книги плана на год: полки "reading" + "want", плюс книги, прочтение которых закрыто (не
 * брошено) в текущем календарном году, но которые уже сошли с этих полок. Книга, вернувшаяся
 * на "reading"/"want" (перечитывание), считается непрочитанной в плане — живая полка важнее
 * прежнего факта дочитывания.
 */
export async function getYearPlan(): Promise<YearPlan> {
  const userId = await requireUserId();
  const db = getDb();
  const currentYear = localYear(new Date());
  const planColumns = { id: books.id, title: books.title, total_pages: books.total_pages };

  const liveBooks = await db
    .select({ ...planColumns, shelf: books.shelf, queue_position: books.queue_position })
    .from(books)
    .where(and(eq(books.user_id, userId), inArray(books.shelf, ["reading", "want"])));

  const finishedReadings = await db
    .select({ book_id: readings.book_id, finished_at: readings.finished_at })
    .from(readings)
    .where(and(eq(readings.user_id, userId), isNotNull(readings.finished_at), eq(readings.is_dropped, false)));

  const finishedIds = new Set(
    finishedReadings
      .filter((reading) => reading.finished_at && localYear(reading.finished_at) === currentYear)
      .map((reading) => reading.book_id),
  );

  const liveIds = new Set(liveBooks.map((book) => book.id));
  const extraIds = Array.from(finishedIds).filter((id) => !liveIds.has(id));

  const extraBooks =
    extraIds.length > 0
      ? await db
          .select(planColumns)
          .from(books)
          .where(and(eq(books.user_id, userId), inArray(books.id, extraIds)))
      : [];

  const readingBooks = liveBooks.filter((book) => book.shelf === "reading");
  const wantBooks = liveBooks
    .filter((book) => book.shelf === "want")
    .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0));

  const planBooks: YearPlanBook[] = [
    ...readingBooks.map((book) => ({ id: book.id, title: book.title, totalPages: book.total_pages, read: false })),
    ...wantBooks.map((book) => ({ id: book.id, title: book.title, totalPages: book.total_pages, read: false })),
    ...extraBooks.map((book) => ({ id: book.id, title: book.title, totalPages: book.total_pages, read: true })),
  ];

  return {
    books: planBooks,
    totalPages: planBooks.reduce((sum, book) => sum + (book.totalPages ?? 0), 0),
    readingCount: readingBooks.length,
    wantCount: wantBooks.length,
    finishedCount: extraBooks.length,
  };
}
