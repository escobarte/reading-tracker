import { getBook } from "@/lib/db/books";
import { getDailyPagesGoal } from "@/lib/db/goals";
import { listNotesPage } from "@/lib/db/notes";
import { getTodaySummary } from "@/lib/db/sessions";
import type { NoteType } from "@/lib/db/types";
import { NotesView } from "./NotesView";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 300;

function parseType(value: string | undefined): NoteType | null {
  return value === "quote" || value === "thought" || value === "word" || value === "photo" ? value : null;
}

function parseLimit(value: string | undefined): number {
  const parsed = value ? Number.parseInt(value, 10) : DEFAULT_LIMIT;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

export default async function NotesPage({ searchParams }: PageProps<"/notes">) {
  const sp = await searchParams;
  const type = parseType(typeof sp.type === "string" ? sp.type : undefined);
  const favorite = sp.favorite === "1";
  const bookId = typeof sp.book === "string" && sp.book ? sp.book : null;
  const query = typeof sp.q === "string" ? sp.q : "";
  const limit = parseLimit(typeof sp.limit === "string" ? sp.limit : undefined);

  const filters = { type, favorite, bookId, query };

  const [{ notes, hasMore }, filterBook, dailyGoal, today] = await Promise.all([
    listNotesPage(filters, limit),
    bookId ? getBook(bookId) : Promise.resolve(null),
    getDailyPagesGoal(),
    getTodaySummary(),
  ]);

  return (
    <NotesView
      notes={notes}
      hasMore={hasMore}
      limit={limit}
      filters={filters}
      filterBookTitle={filterBook?.title ?? null}
      today={{ pages: today.pages, goal: dailyGoal }}
    />
  );
}
