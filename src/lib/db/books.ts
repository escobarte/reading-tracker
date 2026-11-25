import { and, desc, eq, ilike, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb, type Transaction } from "@/db";
import { books, readings } from "@/db/schema";
import { requireUserId } from "@/lib/require-user";
import { localYear } from "@/lib/time";
import {
  assertOwnBook,
  ensureOpenReadingIn,
  findOpenReading,
  firstOrThrow,
  userTransaction,
} from "./query";
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

async function nextQueuePosition(tx: Transaction, userId: string): Promise<number> {
  const [last] = await tx
    .select({ queue_position: books.queue_position })
    .from(books)
    .where(and(eq(books.user_id, userId), eq(books.shelf, "want")))
    .orderBy(sql`${books.queue_position} desc nulls last`)
    .limit(1);
  return (last?.queue_position ?? 0) + 1;
}

/** Нумерует очередь «Хочу прочитать» подряд с 1 одним запросом; меняет только строки с другим номером. */
async function renumberQueue(tx: Transaction, userId: string): Promise<void> {
  await tx.execute(sql`
    update ${books} set queue_position = ranked.position
    from (
      select ${books.id} as id,
             row_number() over (order by ${queueOrder}, ${books.created_at} desc) as position
      from ${books}
      where ${books.user_id} = ${userId} and ${books.shelf} = 'want'
    ) as ranked
    where ${books.id} = ranked.id
      and ${books.user_id} = ${userId}
      and ${books.queue_position} is distinct from ranked.position
  `);
}

export async function createBook(input: BookInput): Promise<Book> {
  return userTransaction(async (tx, userId) => {
    const shelf = input.shelf ?? "want";
    const queue_position = shelf === "want" ? await nextQueuePosition(tx, userId) : null;

    const book = firstOrThrow(
      await tx
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

    if (shelf === "reading") await ensureOpenReadingIn(tx, userId, book.id);

    return book;
  });
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
  await userTransaction(async (tx, userId) => {
    await tx.delete(books).where(ownBook(userId, id));
    await renumberQueue(tx, userId);
  });
}

/** Новый порядок очереди. Список приходит из браузера и мог устареть, поэтому в конце перенумерация. */
export async function reorderQueue(orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return;
  const rows = sql.join(
    orderedIds.map((id, index) => sql`(${id}::uuid, ${index + 1}::int)`),
    sql`, `,
  );
  await userTransaction(async (tx, userId) => {
    await tx.execute(sql`
      update ${books} set queue_position = ordered.position
      from (values ${rows}) as ordered(id, position)
      where ${books.id} = ordered.id
        and ${books.user_id} = ${userId}
        and ${books.shelf} = 'want'
    `);
    await renumberQueue(tx, userId);
  });
}

/** Ставит книгу на полку и перенумеровывает очередь; прочтения не трогает. */
export async function setShelfIn(tx: Transaction, userId: string, id: string, shelf: BookShelf): Promise<void> {
  const queue_position = shelf === "want" ? await nextQueuePosition(tx, userId) : null;
  await tx.update(books).set({ shelf, queue_position }).where(ownBook(userId, id));
  await renumberQueue(tx, userId);
}

/** Закрывает открытое прочтение без зачёта (is_dropped), если оно есть — книга переходит на полку без сохранённого прогресса чтения. */
async function closeOpenReadingWithoutCredit(tx: Transaction, userId: string, bookId: string): Promise<void> {
  const openReading = await findOpenReading(tx, userId, bookId);

  if (openReading) {
    await tx
      .update(readings)
      .set({ finished_at: new Date().toISOString(), is_dropped: true })
      .where(and(eq(readings.id, openReading.id), eq(readings.user_id, userId)));
  }
}

/** Отмечает книгу прочитанной: закрывает открытое прочтение или создаёт уже закрытое. */
async function finishReading(tx: Transaction, userId: string, bookId: string): Promise<void> {
  const openReading = await findOpenReading(tx, userId, bookId);
  const now = new Date().toISOString();

  if (openReading) {
    await tx
      .update(readings)
      .set({ finished_at: now })
      .where(and(eq(readings.id, openReading.id), eq(readings.user_id, userId)));
  } else {
    await assertOwnBook(tx, userId, bookId);
    await tx.insert(readings).values({ user_id: userId, book_id: bookId, started_at: now, finished_at: now });
  }
}

/** Смена полки вместе с прочтением. Для paused и dropped с причиной есть pauseReading и dropReading. */
export async function moveShelf(id: string, shelf: BookShelf): Promise<void> {
  await userTransaction(async (tx, userId) => {
    if (shelf === "want" || shelf === "collection") await closeOpenReadingWithoutCredit(tx, userId, id);
    if (shelf === "reading") await ensureOpenReadingIn(tx, userId, id);
    if (shelf === "done") await finishReading(tx, userId, id);

    await setShelfIn(tx, userId, id, shelf);
  });
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
