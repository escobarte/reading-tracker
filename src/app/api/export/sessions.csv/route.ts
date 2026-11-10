import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, dictionaries, isLocale } from "@/i18n/config";
import { getSessionsForCsv } from "@/lib/db/export";
import { buildCsv } from "@/lib/export/csv";
import { getCurrentUser } from "@/lib/get-current-user";
import { localDateKey, localTimeKey } from "@/lib/time";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const c = dictionaries[locale].exportCsv;

  const rows = await getSessionsForCsv();
  const headers = [
    c.sessionDate,
    c.sessionStart,
    c.sessionEnd,
    c.sessionBook,
    c.sessionPageFrom,
    c.sessionPageTo,
    c.sessionPagesRead,
    c.sessionMinutes,
  ];
  const body = rows.map(({ session, bookTitle }) => [
    localDateKey(session.started_at),
    localTimeKey(new Date(session.started_at)),
    session.ended_at ? localTimeKey(new Date(session.ended_at)) : "",
    bookTitle,
    session.page_from != null ? String(session.page_from) : "",
    session.page_to != null ? String(session.page_to) : "",
    session.pages_read != null ? String(session.pages_read) : "",
    session.seconds != null ? String(Math.round(session.seconds / 60)) : "",
  ]);

  const csv = buildCsv(headers, body);
  const filename = `sessions-${localDateKey(new Date())}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
