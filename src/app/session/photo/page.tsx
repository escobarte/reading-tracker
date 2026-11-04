import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import { dictionaries, DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/i18n/config";
import { getBook } from "@/lib/db/books";
import { getLatestReadingBookId } from "@/lib/db/notes";
import { getCurrentPage } from "@/lib/db/sessions";
import { PhotoNoteWizard } from "./PhotoNoteWizard";

export default async function PhotoNotePage({ searchParams }: PageProps<"/session/photo">) {
  const sp = await searchParams;
  const requestedId = typeof sp.book === "string" && sp.book ? sp.book : null;

  const bookId = requestedId ?? (await getLatestReadingBookId());
  const book = bookId ? await getBook(bookId) : null;

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const t = dictionaries[locale];

  if (!book) {
    return (
      <AppShell variant="focused">
        <p className="py-10 text-center font-serif text-muted">{t.noteEditor.noBooks}</p>
        <Link
          href="/notes"
          className="inline-flex h-12 w-full items-center justify-center rounded-xl border-[1.5px] border-dashed border-stitch bg-surface font-serif text-base text-text"
        >
          {t.common.back}
        </Link>
      </AppShell>
    );
  }

  const currentPage = await getCurrentPage(book.id);

  return <PhotoNoteWizard book={book} currentPage={currentPage} />;
}
