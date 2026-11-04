import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, dictionaries, isLocale } from "@/i18n/config";
import { listNotesForExport, type NoteWithBook } from "@/lib/db/notes";
import type { NoteType } from "@/lib/db/types";
import { formatDeadlineDayMonth, localDateKey } from "@/lib/time";

function parseType(value: string | null): NoteType | null {
  return value === "quote" || value === "thought" || value === "word" || value === "photo" ? value : null;
}

function noteBlock(note: NoteWithBook, locale: "ru" | "en", pageLabel: string): string {
  const dateLabel = formatDeadlineDayMonth(localDateKey(note.created_at), locale);
  const pageSuffix = note.page != null ? ` · ${pageLabel} ${note.page}` : "";
  const meta = `— ${dateLabel}${pageSuffix}`;
  const tagsLine = note.tags.length > 0 ? `\n${note.tags.map((tag) => `#${tag}`).join(" ")}` : "";

  if (note.type === "word") {
    return `- **${note.body}** — ${note.meaning ?? ""}\n  ${meta}${tagsLine}`;
  }
  if (note.type === "thought") {
    return `- ${note.body}\n  ${meta}${tagsLine}`;
  }
  if (note.type === "photo" && !note.body) {
    return `> [фото]\n${meta}${tagsLine}`;
  }
  return `> ${note.body}\n${meta}${tagsLine}`;
}

function buildMarkdown(notes: NoteWithBook[], heading: string, locale: "ru" | "en", pageLabel: string): string {
  const byBook = new Map<string, { title: string; author: string | null; notes: NoteWithBook[] }>();
  for (const note of notes) {
    const key = note.book_id;
    const entry = byBook.get(key) ?? { title: note.bookTitle, author: note.bookAuthor, notes: [] };
    entry.notes.push(note);
    byBook.set(key, entry);
  }

  const books = [...byBook.values()].sort((a, b) => a.title.localeCompare(b.title));
  const sections = books.map((book) => {
    const heading2 = book.author ? `## ${book.title} — ${book.author}` : `## ${book.title}`;
    const blocks = book.notes
      .slice()
      .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
      .map((note) => noteBlock(note, locale, pageLabel));
    return `${heading2}\n\n${blocks.join("\n\n")}`;
  });

  return `${heading}\n\n${sections.join("\n\n")}\n`;
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const t = dictionaries[locale];

  const sp = request.nextUrl.searchParams;
  const filters = {
    type: parseType(sp.get("type")),
    favorite: sp.get("favorite") === "1",
    bookId: sp.get("book"),
    query: sp.get("q") ?? "",
  };

  const notes = await listNotesForExport(filters);
  const heading = t.notes.exportHeading;
  const markdown = notes.length > 0 ? buildMarkdown(notes, heading, locale, t.notes.exportPageLabel) : `${heading}\n`;
  const filename = `notes-${localDateKey(new Date())}.md`;

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
