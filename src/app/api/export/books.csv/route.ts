import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, dictionaries, isLocale } from "@/i18n/config";
import { getBooksForCsv } from "@/lib/db/export";
import { buildCsv } from "@/lib/export/csv";
import { formatLabel, shelfLabel } from "@/lib/export/labels";
import { getCurrentUser } from "@/lib/get-current-user";
import { localDateKey } from "@/lib/time";
import { pauseReasonLabel } from "@/lib/pause-reasons";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const t = dictionaries[locale];
  const c = t.exportCsv;

  const rows = await getBooksForCsv();
  const headers = [
    c.bookTitle,
    c.bookAuthor,
    c.bookFormat,
    c.bookPages,
    c.bookShelf,
    c.bookGenre,
    c.bookTags,
    c.bookIsbn,
    c.bookLanguage,
    c.bookStarted,
    c.bookFinished,
    c.bookRating,
    c.bookReview,
    c.bookSummary,
    c.bookPauseReason,
  ];
  const body = rows.map(({ book, reading }) => [
    book.title,
    book.author ?? "",
    formatLabel(book.format, t),
    book.total_pages != null ? String(book.total_pages) : "",
    shelfLabel(book.shelf, t),
    book.genre ?? "",
    book.tags.join("; "),
    book.isbn ?? "",
    book.language ?? "",
    reading?.started_at ? localDateKey(reading.started_at) : "",
    reading?.finished_at ? localDateKey(reading.finished_at) : "",
    reading?.rating != null ? String(reading.rating) : "",
    reading?.review ?? "",
    reading?.summary ?? "",
    reading?.pause_reason ? pauseReasonLabel(reading.pause_reason, t) : "",
  ]);

  const csv = buildCsv(headers, body);
  const filename = `books-${localDateKey(new Date())}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
