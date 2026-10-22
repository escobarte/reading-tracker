import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { DEFAULT_LOCALE, LOCALE_COOKIE, dictionaries, isLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { createTestBook, deleteTestBook } from "./actions";

export default async function DevDbPage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const t = dictionaries[locale];

  const supabase = await createClient();
  const { data: books } = await supabase
    .from("books")
    .select("id, title")
    .order("created_at", { ascending: false });

  return (
    <AppShell variant="narrow">
      <PageHeader title={t.devdb.title} />

      <form action={createTestBook} className="flex items-end gap-3 py-4">
        <div className="flex-1">
          <Input
            label={t.devdb.inputLabel}
            name="title"
            placeholder={t.devdb.inputPlaceholder}
            required
          />
        </div>
        <Button type="submit">{t.devdb.create}</Button>
      </form>

      <ul className="flex flex-col gap-2 pb-6">
        {books && books.length > 0 ? (
          books.map((book) => (
            <li
              key={book.id}
              className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface p-3"
            >
              <span className="font-serif text-base text-text">{book.title}</span>
              <form action={deleteTestBook}>
                <input type="hidden" name="id" value={book.id} />
                <button
                  type="submit"
                  aria-label={t.devdb.delete}
                  className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch text-text"
                >
                  <Icon name="close" />
                </button>
              </form>
            </li>
          ))
        ) : (
          <p className="py-6 text-center font-serif text-sm text-muted">{t.devdb.empty}</p>
        )}
      </ul>
    </AppShell>
  );
}
