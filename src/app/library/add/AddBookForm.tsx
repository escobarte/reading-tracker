"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { BookForm, emptyBookFormValues, type BookFormValues } from "@/components/ui/BookForm";
import { Cover } from "@/components/ui/Cover";
import { Icon } from "@/components/ui/Icon";
import { useLocale } from "@/i18n/LocaleProvider";
import type { BookSearchResult } from "@/lib/google-books";
import { addBookAction, type AddBookResult } from "./actions";

export function AddBookForm() {
  const { t } = useLocale();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [selected, setSelected] = useState<BookSearchResult | null>(null);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    const timeout = setTimeout(async () => {
      if (!trimmed) {
        setResults([]);
        setSearchFailed(false);
        return;
      }
      setSearching(true);
      try {
        const response = await fetch(`/api/books/search?q=${encodeURIComponent(trimmed)}`);
        const json: { results?: BookSearchResult[]; error?: string } = await response.json();
        setResults(json.results ?? []);
        setSearchFailed(Boolean(json.error));
      } catch {
        setResults([]);
        setSearchFailed(true);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const [result, formAction, pending] = useActionState<AddBookResult | undefined, BookFormValues>(
    async (_prev, values) => {
      const outcome = await addBookAction({
        title: values.title,
        author: values.author || null,
        total_pages: values.total_pages,
        format: values.format,
        shelf: values.shelf,
        genre: values.genre || null,
        series: values.series || null,
        series_number: values.series_number,
        tags: values.tags,
        google_books_id: selected?.google_books_id ?? null,
        cover_url: selected?.cover_url ?? null,
        isbn: selected?.isbn ?? null,
        language: selected?.language ?? null,
      });
      if (outcome.ok) router.push(`/books/${outcome.id}`);
      return outcome;
    },
    undefined,
  );

  const initialValues: BookFormValues = selected
    ? {
        ...emptyBookFormValues,
        title: selected.title,
        author: selected.author ?? "",
        total_pages: selected.total_pages,
        genre: selected.genre ?? "",
      }
    : emptyBookFormValues;

  return (
    <div className="flex flex-col gap-6 py-6 lg:flex-row lg:items-start lg:gap-6 lg:py-8">
      <div className="flex-1 lg:max-w-[460px]">
        <div className="relative mb-4">
          <Icon
            name="search"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setManual(false);
            }}
            placeholder={t.addbook.searchPlaceholder}
            aria-label={t.addbook.searchPlaceholder}
            className="h-14 w-full rounded-xl border-2 border-accent bg-input pl-12 pr-4 font-serif text-lg text-text outline-none"
          />
        </div>

        {results.length > 0 && !manual && (
          <>
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.14em] text-accent">
              {t.addbook.foundLabel}
            </p>
            <ul className="mb-4 flex flex-col gap-2">
              {results.map((item) => {
                const isSelected = selected?.google_books_id === item.google_books_id && selected?.title === item.title;
                return (
                  <li key={`${item.google_books_id ?? ""}-${item.title}`}>
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className={`flex w-full items-center gap-3 rounded-[14px] bg-surface p-3 text-left ${
                        isSelected ? "border-2 border-accent" : "border border-line"
                      }`}
                    >
                      <Cover title={item.title} coverUrl={item.cover_url ?? undefined} size="search" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-serif text-[18px] font-bold text-text">{item.title}</p>
                        {item.author && <p className="truncate font-serif text-sm text-muted">{item.author}</p>}
                        <p className="font-mono text-xs text-muted">
                          {[item.total_pages ? `${item.total_pages} ${t.book.pagesUnit}` : null, item.language]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-on">
                          <Icon name="check" width={16} height={16} />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {searchFailed && <p className="mb-4 font-serif text-sm text-deadline">{t.addbook.searchError}</p>}

        <button
          type="button"
          onClick={() => {
            setManual(true);
            setSelected(null);
            setResults([]);
            setQuery("");
          }}
          className="flex h-12 w-full items-center justify-center rounded-xl border-[1.5px] border-dashed border-stitch font-serif text-base text-text"
        >
          {t.addbook.manualButton}
        </button>
      </div>

      <div className="flex-1 lg:max-w-[460px]">
        <BookForm
          key={selected ? `${selected.google_books_id}-${selected.title}` : manual ? "manual" : "empty"}
          initial={initialValues}
          mode="add"
          pending={pending || searching}
          onSubmit={(values) => formAction(values)}
        />

        {result && !result.ok && result.reason === "duplicate" && (
          <p className="mt-3 font-serif text-sm text-deadline">
            {t.addbook.duplicateMessage} ·{" "}
            <Link href={`/books/${result.existingId}`} className="underline">
              {result.existingTitle}
            </Link>
          </p>
        )}
        {result && !result.ok && result.reason === "error" && (
          <p className="mt-3 font-serif text-sm text-deadline">{t.addbook.saveError}</p>
        )}
      </div>
    </div>
  );
}
