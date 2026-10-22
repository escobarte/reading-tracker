"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { BookForm, emptyBookFormValues, type BookFormValues } from "@/components/ui/BookForm";
import { Cover } from "@/components/ui/Cover";
import { Icon } from "@/components/ui/Icon";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/types";
import type { BookSearchResult } from "@/lib/google-books";
import { addBookAction, type AddBookResult } from "./actions";

function formatLanguage(code: string | null, t: Dictionary): string | null {
  if (!code) return null;
  const normalized = code.trim().toLowerCase();
  if (normalized === "ru" || normalized === "rus") return t.addbook.langRu;
  if (normalized === "en" || normalized === "eng") return t.addbook.langEn;
  if (normalized === "ro" || normalized === "ron" || normalized === "rum") return t.addbook.langRo;
  return normalized.slice(0, 2).toUpperCase();
}

export function AddBookForm() {
  const { t } = useLocale();
  const router = useRouter();
  const duplicateRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [manual, setManual] = useState(false);
  const [duplicate, setDuplicate] = useState<{ id: string; title: string } | null>(null);

  const selected = selectedIndex !== null ? results[selectedIndex] : null;

  function clearDuplicate() {
    setDuplicate(null);
  }

  useEffect(() => {
    const trimmed = query.trim();
    const timeout = setTimeout(async () => {
      if (!trimmed) {
        setResults([]);
        setSearchFailed(false);
        setSelectedIndex(null);
        return;
      }
      setSearching(true);
      try {
        const response = await fetch(`/api/books/search?q=${encodeURIComponent(trimmed)}`);
        const json: { results?: BookSearchResult[]; error?: string } = await response.json();
        setResults(json.results ?? []);
        setSearchFailed(Boolean(json.error));
        setSelectedIndex(null);
      } catch {
        setResults([]);
        setSearchFailed(true);
        setSelectedIndex(null);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (duplicate) duplicateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [duplicate]);

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
      if (outcome.ok) {
        router.push(`/books/${outcome.id}`);
      } else if (outcome.reason === "duplicate") {
        setDuplicate({ id: outcome.existingId, title: outcome.existingTitle });
      }
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
              {results.map((item, index) => {
                const isSelected = selectedIndex === index;
                return (
                  <li key={`${item.google_books_id ?? "ol"}-${index}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIndex(index);
                        clearDuplicate();
                      }}
                      className={`flex w-full items-center gap-3 rounded-[14px] bg-surface p-3 text-left ${
                        isSelected ? "border-2 border-accent" : "border border-line"
                      }`}
                    >
                      <Cover title={item.title} coverUrl={item.cover_url ?? undefined} size="search" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-serif text-[18px] font-bold text-text">{item.title}</p>
                        {item.author && <p className="truncate font-serif text-sm text-muted">{item.author}</p>}
                        <p className="font-mono text-xs text-muted">
                          {[
                            item.total_pages ? `${item.total_pages} ${t.book.pagesUnit}` : null,
                            formatLanguage(item.language, t),
                          ]
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
            setSelectedIndex(null);
            setResults([]);
            setQuery("");
            clearDuplicate();
          }}
          className="flex h-12 w-full items-center justify-center rounded-xl border-[1.5px] border-dashed border-stitch font-serif text-base text-text"
        >
          {t.addbook.manualButton}
        </button>
      </div>

      <div className="flex-1 lg:max-w-[460px]">
        <BookForm
          key={selectedIndex !== null ? `result-${selectedIndex}` : manual ? "manual" : "empty"}
          initial={initialValues}
          mode="add"
          pending={pending || searching}
          onDirty={clearDuplicate}
          onSubmit={(values) => formAction(values)}
          duplicateBanner={
            duplicate && (
              <div
                ref={duplicateRef}
                className="flex flex-col gap-2 rounded-xl border-[1.5px] border-deadline bg-surface p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="font-serif text-sm font-bold text-deadline">{t.addbook.duplicateMessage}</p>
                <Link
                  href={`/books/${duplicate.id}`}
                  className="inline-flex h-9 items-center justify-center rounded-lg border-[1.5px] border-dashed border-deadline px-3 font-serif text-sm font-bold text-deadline"
                >
                  {t.addbook.duplicateLink} · {duplicate.title}
                </Link>
              </div>
            )
          }
        />

        {result && !result.ok && result.reason === "error" && (
          <p className="mt-3 font-serif text-sm text-deadline">{t.addbook.saveError}</p>
        )}
      </div>
    </div>
  );
}
