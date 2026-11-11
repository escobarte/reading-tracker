"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AddButton } from "@/components/ui/AddButton";
import { BookRow } from "@/components/ui/BookRow";
import { Button } from "@/components/ui/Button";
import { Cover } from "@/components/ui/Cover";
import { Chip } from "@/components/ui/Chip";
import { Dropdown } from "@/components/ui/Dropdown";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { SortableBookRow } from "@/components/ui/SortableBookRow";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatCount } from "@/i18n/plural";
import { formatTemplate } from "@/i18n/format";
import { formatMonthLabel, formatShortDateWithYear, localYear } from "@/lib/time";
import { pauseReasonLabel } from "@/lib/pause-reasons";
import type { Book, BookFormat, BookShelf, Reading } from "@/lib/db/types";
import { continueLastReadingAction } from "@/app/books/[id]/actions";
import { moveShelfAction, reorderQueueAction } from "./actions";

const SHELVES: BookShelf[] = ["reading", "want", "collection", "done", "paused", "dropped"];
type SortMode = "queue" | "title" | "author";
type DoneSortMode = "date" | "rating" | "title";
type CollectionSortMode = "added" | "title";
type RatingFilter = "all" | "5" | "4" | "3-" | "none";

function parseShelf(value: string | null): BookShelf {
  return value === "want" || value === "collection" || value === "done" || value === "paused" || value === "dropped"
    ? value
    : "reading";
}
function parseFormat(value: string | null): "all" | BookFormat {
  return value === "paper" || value === "ebook" ? value : "all";
}
function parseSort(value: string | null): SortMode {
  return value === "title" || value === "author" ? value : "queue";
}
function parseDoneSort(value: string | null): DoneSortMode {
  return value === "rating" || value === "title" ? value : "date";
}
function parseCollectionSort(value: string | null): CollectionSortMode {
  return value === "title" ? value : "added";
}
function parseRatingFilter(value: string | null): RatingFilter {
  return value === "5" || value === "4" || value === "3-" || value === "none" ? value : "all";
}
function matchesRatingFilter(rating: number | null, filter: RatingFilter): boolean {
  if (filter === "all") return true;
  if (filter === "none") return rating == null;
  if (filter === "3-") return rating != null && rating <= 3;
  return rating === Number(filter);
}

export function LibraryView({
  initialBooks,
  today,
  readingByBookId,
  currentYear,
}: {
  initialBooks: Book[];
  today: { pages: number; goal: number };
  readingByBookId: Record<string, Reading>;
  currentYear: number;
}) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [books, setBooks] = useState(initialBooks);
  const shelf = parseShelf(searchParams.get("shelf"));
  const format = parseFormat(searchParams.get("format"));
  const sortMode = parseSort(searchParams.get("sort"));
  const doneSort = parseDoneSort(searchParams.get("sort"));
  const collectionSort = parseCollectionSort(searchParams.get("sort"));
  const ratingFilter = parseRatingFilter(searchParams.get("rating"));
  const yearFilter = searchParams.get("year") ?? String(currentYear);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const suppressClickRef = useRef(false);

  function updateParams(patch: { shelf?: BookShelf; format?: "all" | BookFormat; sort?: string; rating?: string; year?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const defaults: Record<string, string> = {
      shelf: "reading",
      format: "all",
      sort: shelf === "done" ? "date" : shelf === "collection" ? "added" : "queue",
      rating: "all",
      year: String(currentYear),
    };
    for (const [key, value] of Object.entries(patch)) {
      if (value === defaults[key]) {
        params.delete(key);
      } else {
        params.set(key, value as string);
      }
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function setShelf(value: BookShelf) {
    updateParams({ shelf: value });
  }
  function setFormat(value: "all" | BookFormat) {
    updateParams({ format: value });
  }
  function setSortMode(value: SortMode) {
    updateParams({ sort: value });
  }
  function setDoneSort(value: DoneSortMode) {
    updateParams({ sort: value });
  }
  function setCollectionSort(value: CollectionSortMode) {
    updateParams({ sort: value });
  }
  function setRatingFilter(value: RatingFilter) {
    updateParams({ rating: value });
  }
  function setYearFilter(value: string) {
    updateParams({ year: value });
  }
  function resetDoneFilters() {
    setQuery("");
    updateParams({ rating: "all", year: String(currentYear) });
  }

  const shelfLabels: Record<BookShelf, string> = {
    reading: t.library.shelfReading,
    want: t.library.shelfWant,
    collection: t.library.shelfCollection,
    done: t.library.shelfDone,
    paused: t.library.shelfPaused,
    dropped: t.library.shelfDropped,
  };
  const formatLabels: Record<BookFormat, string> = {
    paper: t.library.filterFormatPaper,
    ebook: t.library.filterFormatEbook,
  };

  const counts = useMemo(() => {
    const result: Record<BookShelf, number> = { reading: 0, want: 0, collection: 0, done: 0, paused: 0, dropped: 0 };
    for (const book of books) result[book.shelf] += 1;
    return result;
  }, [books]);

  const collectionEntries = useMemo(() => {
    let list = books.filter((book) => book.shelf === "collection");
    if (format !== "all") list = list.filter((book) => book.format === format);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (book) => book.title.toLowerCase().includes(q) || (book.author ?? "").toLowerCase().includes(q),
      );
    }

    const sorted = [...list];
    if (collectionSort === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title, locale));
    } else {
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return sorted;
  }, [books, format, query, collectionSort, locale]);

  const effectiveSort: SortMode = shelf === "want" ? sortMode : sortMode === "queue" ? "title" : sortMode;
  const isQueueView = shelf === "want" && effectiveSort === "queue" && format === "all" && query.trim() === "";

  const visibleBooks = useMemo(() => {
    let list = books.filter((book) => book.shelf === shelf);
    if (format !== "all") list = list.filter((book) => book.format === format);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (book) =>
          book.title.toLowerCase().includes(q) || (book.author ?? "").toLowerCase().includes(q),
      );
    }

    const sorted = [...list];
    if (effectiveSort === "queue") {
      sorted.sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0));
    } else if (effectiveSort === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title, locale));
    } else {
      sorted.sort((a, b) => (a.author ?? "").localeCompare(b.author ?? "", locale));
    }
    return sorted;
  }, [books, shelf, format, query, effectiveSort, locale]);

  const doneEntries = useMemo(() => {
    let list = books
      .filter((book) => book.shelf === "done")
      .map((book) => {
        const meta = readingByBookId[book.id];
        return { book, rating: meta?.rating ?? null, finishedAt: meta?.finished_at ?? null };
      });

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        ({ book }) => book.title.toLowerCase().includes(q) || (book.author ?? "").toLowerCase().includes(q),
      );
    }
    list = list.filter(({ rating }) => matchesRatingFilter(rating, ratingFilter));
    if (yearFilter !== "all") {
      list = list.filter(({ finishedAt }) => finishedAt != null && String(localYear(finishedAt)) === yearFilter);
    }

    const sorted = [...list];
    if (doneSort === "date") {
      sorted.sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""));
    } else if (doneSort === "rating") {
      sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    } else {
      sorted.sort((a, b) => a.book.title.localeCompare(b.book.title, locale));
    }
    return sorted;
  }, [books, readingByBookId, query, ratingFilter, yearFilter, doneSort, locale]);

  const doneGroups = useMemo(() => {
    if (doneSort !== "date") return null;
    const byKey = new Map<string, typeof doneEntries>();
    for (const entry of doneEntries) {
      const key = entry.finishedAt ? entry.finishedAt.slice(0, 7) : "";
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(entry);
    }
    return Array.from(byKey.entries()).map(([key, entries]) => ({
      key,
      label: entries[0].finishedAt ? formatMonthLabel(entries[0].finishedAt, locale) : "",
      entries,
    }));
  }, [doneEntries, doneSort, locale]);

  const doneAvailableYears = useMemo(() => {
    const years = new Set<number>();
    for (const book of books) {
      if (book.shelf !== "done") continue;
      const finishedAt = readingByBookId[book.id]?.finished_at;
      if (finishedAt) years.add(localYear(finishedAt));
    }
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [books, readingByBookId, currentYear]);

  const doneRatedCount = doneEntries.filter((entry) => entry.rating != null).length;
  const doneAvgRating =
    doneRatedCount > 0
      ? doneEntries.reduce((sum, entry) => sum + (entry.rating ?? 0), 0) / doneRatedCount
      : null;
  const doneFiltersActive = ratingFilter !== "all" || yearFilter !== "all" || query.trim() !== "";
  const doneTotalCount = useMemo(() => books.filter((book) => book.shelf === "done").length, [books]);

  const pausedOrDroppedEntries = useMemo(() => {
    if (shelf !== "paused" && shelf !== "dropped") return [];
    let list = books
      .filter((book) => book.shelf === shelf)
      .map((book) => {
        const meta = readingByBookId[book.id];
        return {
          book,
          reasonCode: meta?.pause_reason ?? null,
          note: meta?.pause_note ?? null,
          stoppedAt: meta?.stopped_at ?? null,
        };
      });
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        ({ book }) => book.title.toLowerCase().includes(q) || (book.author ?? "").toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => (b.stoppedAt ?? "").localeCompare(a.stoppedAt ?? ""));
  }, [books, readingByBookId, shelf, query]);

  const selectedBook = books.find((book) => book.id === selectedId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart() {
    suppressClickRef.current = true;
  }

  function releaseClickSuppression() {
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 150);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      releaseClickSuppression();
      return;
    }

    const wantBooks = books
      .filter((book) => book.shelf === "want")
      .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0));
    const oldIndex = wantBooks.findIndex((book) => book.id === active.id);
    const newIndex = wantBooks.findIndex((book) => book.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      releaseClickSuppression();
      return;
    }

    const reordered = arrayMove(wantBooks, oldIndex, newIndex);
    const reorderedIds = reordered.map((book) => book.id);

    setBooks((prev) => {
      const positionById = new Map(reorderedIds.map((id, index) => [id, index + 1]));
      return prev.map((book) =>
        positionById.has(book.id) ? { ...book, queue_position: positionById.get(book.id)! } : book,
      );
    });

    startTransition(() => {
      reorderQueueAction(reorderedIds).then(() => router.refresh());
    });
    releaseClickSuppression();
  }

  function handleStartReading(id: string) {
    setBooks((prev) => prev.map((book) => (book.id === id ? { ...book, shelf: "reading" } : book)));
    startTransition(() => {
      moveShelfAction(id, "reading").then(() => router.refresh());
    });
  }

  function handleContinueBook(id: string) {
    setBooks((prev) => prev.map((book) => (book.id === id ? { ...book, shelf: "reading" } : book)));
    startTransition(() => {
      continueLastReadingAction(id).then(() => router.refresh());
    });
  }

  function handleReadFromCollection(id: string) {
    setBooks((prev) => prev.map((book) => (book.id === id ? { ...book, shelf: "want" } : book)));
    startTransition(() => {
      moveShelfAction(id, "want").then(() => router.refresh());
    });
  }

  return (
    <AppShell today={today}>
      <header className="flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">{t.common.appName}</p>
          <h1 className="font-serif text-[28px] font-bold leading-[1.15] text-text lg:text-[34px]">
            {t.library.title}
          </h1>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.library.searchPlaceholder}
            aria-label={t.library.search}
            className="h-12 w-[380px] rounded-xl border-[1.5px] border-line bg-input px-4 font-serif text-base text-text outline-none focus:border-2 focus:border-accent"
          />
          <Link
            href="/library/add"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-5 font-serif text-base font-bold text-accent-on shadow-[var(--shadow-cta)]"
          >
            <Icon name="plus" width={20} height={20} />
            {t.library.addBook}
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            aria-label={t.library.search}
            onClick={() => setSearchOpen((value) => !value)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
          >
            <Icon name="search" />
          </button>
          <Link href="/library/add">
            <AddButton label={t.library.addBook} />
          </Link>
        </div>
      </header>

      {searchOpen && (
        <div className="pb-4 lg:hidden">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.library.searchPlaceholder}
            aria-label={t.library.search}
            className="h-12 w-full rounded-xl border-[1.5px] border-line bg-input px-4 font-serif text-base text-text outline-none focus:border-2 focus:border-accent"
          />
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-4 lg:flex-wrap lg:overflow-visible">
        {SHELVES.map((value) => (
          <Pill
            key={value}
            active={shelf === value}
            count={counts[value]}
            onClick={() => setShelf(value)}
            className="shrink-0"
          >
            {shelfLabels[value]}
          </Pill>
        ))}
      </div>

      {shelf === "done" ? (
        <div className="flex flex-wrap items-center gap-2 pb-5">
          <Dropdown
            trigger={doneSort === "date" ? t.library.sortDate : doneSort === "rating" ? t.library.sortRating : t.library.sortTitle}
            items={[
              { label: t.library.sortDate, active: doneSort === "date", onSelect: () => setDoneSort("date") },
              { label: t.library.sortRating, active: doneSort === "rating", onSelect: () => setDoneSort("rating") },
              { label: t.library.sortTitle, active: doneSort === "title", onSelect: () => setDoneSort("title") },
            ]}
          />
          <Dropdown
            trigger={
              ratingFilter === "all"
                ? t.library.filterRatingAll
                : ratingFilter === "5"
                  ? t.library.filterRating5
                  : ratingFilter === "4"
                    ? t.library.filterRating4
                    : ratingFilter === "3-"
                      ? t.library.filterRating3OrLess
                      : t.library.filterRatingNone
            }
            items={[
              { label: t.library.filterRatingAll, active: ratingFilter === "all", onSelect: () => setRatingFilter("all") },
              { label: t.library.filterRating5, active: ratingFilter === "5", onSelect: () => setRatingFilter("5") },
              { label: t.library.filterRating4, active: ratingFilter === "4", onSelect: () => setRatingFilter("4") },
              { label: t.library.filterRating3OrLess, active: ratingFilter === "3-", onSelect: () => setRatingFilter("3-") },
              { label: t.library.filterRatingNone, active: ratingFilter === "none", onSelect: () => setRatingFilter("none") },
            ]}
          />
          <Dropdown
            trigger={yearFilter === "all" ? t.library.filterYearAll : yearFilter}
            items={[
              ...doneAvailableYears.map((year) => ({
                label: String(year),
                active: yearFilter === String(year),
                onSelect: () => setYearFilter(String(year)),
              })),
              { label: t.library.filterYearAll, active: yearFilter === "all", onSelect: () => setYearFilter("all") },
            ]}
          />
          <span className="ml-auto font-mono text-xs text-muted">
            {formatCount(doneEntries.length, "book", locale)}
            {doneAvgRating != null ? ` · ${t.library.averageLabel} ${doneAvgRating.toFixed(1)}` : ""}
          </span>
        </div>
      ) : shelf === "paused" || shelf === "dropped" ? null : shelf === "collection" ? (
        <div className="flex flex-col gap-3 pb-5">
          <p className="font-serif text-sm text-muted">{t.library.collectionHint}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Dropdown
              trigger={format === "all" ? t.library.filterFormatAll : formatLabels[format]}
              items={[
                { label: t.library.filterFormatAll, active: format === "all", onSelect: () => setFormat("all") },
                { label: t.library.filterFormatPaper, active: format === "paper", onSelect: () => setFormat("paper") },
                { label: t.library.filterFormatEbook, active: format === "ebook", onSelect: () => setFormat("ebook") },
              ]}
            />
            <Dropdown
              trigger={collectionSort === "added" ? t.library.sortAdded : t.library.sortTitle}
              items={[
                { label: t.library.sortAdded, active: collectionSort === "added", onSelect: () => setCollectionSort("added") },
                { label: t.library.sortTitle, active: collectionSort === "title", onSelect: () => setCollectionSort("title") },
              ]}
            />
            <span className="ml-auto font-mono text-xs text-muted">
              {formatCount(collectionEntries.length, "book", locale)}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 pb-5">
          <Dropdown
            trigger={format === "all" ? t.library.filterFormatAll : formatLabels[format]}
            items={[
              { label: t.library.filterFormatAll, active: format === "all", onSelect: () => setFormat("all") },
              { label: t.library.filterFormatPaper, active: format === "paper", onSelect: () => setFormat("paper") },
              { label: t.library.filterFormatEbook, active: format === "ebook", onSelect: () => setFormat("ebook") },
            ]}
          />
          <Dropdown
            trigger={
              effectiveSort === "queue"
                ? t.library.sortQueue
                : effectiveSort === "title"
                  ? t.library.sortTitle
                  : t.library.sortAuthor
            }
            items={[
              ...(shelf === "want"
                ? [{ label: t.library.sortQueue, active: effectiveSort === "queue", onSelect: () => setSortMode("queue") }]
                : []),
              { label: t.library.sortTitle, active: effectiveSort === "title", onSelect: () => setSortMode("title") },
              { label: t.library.sortAuthor, active: effectiveSort === "author", onSelect: () => setSortMode("author") },
            ]}
          />
          <span className="ml-auto font-mono text-xs text-muted">
            {formatCount(visibleBooks.length, "book", locale)}
          </span>
        </div>
      )}

      {shelf === "done" ? (
        doneEntries.length === 0 ? (
          <EmptyState
            title={doneTotalCount === 0 ? t.library.emptyDone : t.library.notFoundTitle}
            ctaLabel={doneTotalCount > 0 && doneFiltersActive ? t.library.resetFilters : undefined}
            onCta={doneTotalCount > 0 && doneFiltersActive ? resetDoneFilters : undefined}
          />
        ) : (
          <div className="flex flex-col gap-5 lg:max-w-[1000px]">
            {doneGroups
              ? doneGroups.map((group) => (
                  <div key={group.key}>
                    {group.label && (
                      <p className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-accent">{group.label}</p>
                    )}
                    <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
                      {group.entries.map((entry) => (
                        <DoneBookCard key={entry.book.id} book={entry.book} rating={entry.rating} finishedAt={entry.finishedAt} />
                      ))}
                    </div>
                  </div>
                ))
              : (
                  <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
                    {doneEntries.map((entry) => (
                      <DoneBookCard key={entry.book.id} book={entry.book} rating={entry.rating} finishedAt={entry.finishedAt} />
                    ))}
                  </div>
                )}
          </div>
        )
      ) : shelf === "paused" || shelf === "dropped" ? (
        pausedOrDroppedEntries.length === 0 ? (
          <EmptyState
            title={
              books.filter((book) => book.shelf === shelf).length === 0
                ? shelf === "paused"
                  ? t.library.emptyPaused
                  : t.library.emptyDropped
                : t.library.notFoundTitle
            }
            ctaLabel={books.filter((book) => book.shelf === shelf).length > 0 && query.trim() !== "" ? t.library.resetFilters : undefined}
            onCta={() => setQuery("")}
          />
        ) : (
          <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:max-w-[1000px]">
            {pausedOrDroppedEntries.map((entry) => (
              <PausedDroppedBookCard
                key={entry.book.id}
                book={entry.book}
                mode={shelf as "paused" | "dropped"}
                reasonCode={entry.reasonCode}
                note={entry.note}
                stoppedAt={entry.stoppedAt}
                onContinue={() => handleContinueBook(entry.book.id)}
              />
            ))}
          </div>
        )
      ) : shelf === "collection" ? (
        collectionEntries.length === 0 ? (
          <EmptyState title={t.library.collectionEmpty} />
        ) : (
          <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
            {collectionEntries.map((book) => (
              <CollectionBookCard
                key={book.id}
                book={book}
                formatLabel={formatLabels[book.format]}
                readLabel={t.library.collectionReadButton}
                onRead={() => handleReadFromCollection(book.id)}
              />
            ))}
          </div>
        )
      ) : visibleBooks.length === 0 ? (
        <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-stitch bg-surface p-8 text-center">
          <p className="font-serif text-lg font-bold text-text">{t.library.empty}</p>
          <Link href="/library/add">
            <Button>{t.library.emptyCta}</Button>
          </Link>
        </div>
      ) : (
        <div className="flex gap-6 lg:items-start">
          <div className="flex-1 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:self-start">
            {isQueueView ? (
              <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext items={visibleBooks.map((book) => book.id)} strategy={verticalListSortingStrategy}>
                  {visibleBooks.map((book, index) => (
                    <SortableBookRow
                      key={book.id}
                      book={book}
                      position={index + 1}
                      isNext={index === 0}
                      selected={selectedId === book.id}
                      nextLabel={t.library.nextLabel}
                      formatLabel={formatLabels[book.format]}
                      dragLabel={t.library.dragLabel}
                      onSelect={setSelectedId}
                      suppressClickRef={suppressClickRef}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              visibleBooks.map((book) => (
                <div key={book.id} className="mb-2 lg:mb-0">
                  <BookRow
                    book={book}
                    formatLabel={formatLabels[book.format]}
                    selected={selectedId === book.id}
                    onSelect={setSelectedId}
                  />
                </div>
              ))
            )}
          </div>

          {selectedBook && (
            <aside className="hidden w-[320px] shrink-0 self-start lg:block">
              <SelectedPanel book={selectedBook} onStartReading={handleStartReading} />
            </aside>
          )}
        </div>
      )}
    </AppShell>
  );
}

function EmptyState({
  title,
  ctaLabel,
  onCta,
}: {
  title: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="flex min-h-[30dvh] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-stitch bg-surface p-8 text-center">
      <p className="font-serif text-lg font-bold text-text">{title}</p>
      {ctaLabel && onCta && (
        <Button variant="secondary" onClick={onCta}>
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}

function CollectionBookCard({
  book,
  formatLabel,
  readLabel,
  onRead,
}: {
  book: Book;
  formatLabel: string;
  readLabel: string;
  onRead: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-3">
      <Link href={`/books/${book.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Cover title={book.title} coverUrl={book.cover_url ?? undefined} size="row" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-[17px] font-bold leading-[1.15] text-text">{book.title}</p>
          {book.author && <p className="truncate font-serif text-[13px] text-muted">{book.author}</p>}
          <p className="truncate font-mono text-xs text-muted">
            {formatLabel}
            {book.total_pages ? ` · ${book.total_pages} ${t.book.pagesUnit}` : ""}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={onRead}
        className="h-11 shrink-0 rounded-lg border-[1.5px] border-dashed border-accent px-4 font-serif text-sm font-bold text-accent"
      >
        {readLabel}
      </button>
    </div>
  );
}

function DoneBookCard({
  book,
  rating,
  finishedAt,
}: {
  book: Book;
  rating: number | null;
  finishedAt: string | null;
}) {
  const { t, locale } = useLocale();
  return (
    <Link
      href={`/books/${book.id}`}
      className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-3"
    >
      <Cover title={book.title} coverUrl={book.cover_url ?? undefined} size="row" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[17px] font-bold leading-[1.15] text-text">{book.title}</p>
        {book.author && <p className="truncate font-serif text-[13px] text-muted">{book.author}</p>}
        {rating != null ? (
          <div
            className="mt-1 flex items-center gap-0.5"
            role="img"
            aria-label={formatTemplate(t.home.recentRatingLabel, { rating })}
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = n <= rating;
              return (
                <Icon
                  key={n}
                  name="favorite"
                  width={15}
                  height={15}
                  aria-hidden="true"
                  className={filled ? "text-accent" : "text-stitch"}
                  style={filled ? { fill: "currentColor" } : { fill: "none", strokeDasharray: "2 2" }}
                />
              );
            })}
          </div>
        ) : (
          <p className="mt-1 font-mono text-xs text-muted">{t.library.filterRatingNone}</p>
        )}
        {finishedAt && (
          <p className="mt-1 font-mono text-xs text-muted">
            {formatTemplate(t.library.finishedOn, { date: formatShortDateWithYear(finishedAt, locale) })}
          </p>
        )}
      </div>
    </Link>
  );
}

function PausedDroppedBookCard({
  book,
  mode,
  reasonCode,
  note,
  stoppedAt,
  onContinue,
}: {
  book: Book;
  mode: "paused" | "dropped";
  reasonCode: string | null;
  note: string | null;
  stoppedAt: string | null;
  onContinue: () => void;
}) {
  const { t, locale } = useLocale();
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-3">
      <Link href={`/books/${book.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Cover title={book.title} coverUrl={book.cover_url ?? undefined} size="row" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-[17px] font-bold leading-[1.15] text-text">{book.title}</p>
          {book.author && <p className="truncate font-serif text-[13px] text-muted">{book.author}</p>}
          <p className="truncate font-mono text-xs text-muted">
            {reasonCode ? pauseReasonLabel(reasonCode, t) : t.library.noReason}
            {note ? ` · ${note}` : ""}
          </p>
          {stoppedAt && (
            <p className="mt-0.5 font-mono text-xs text-muted">
              {formatTemplate(t.library.stoppedOn, { date: formatShortDateWithYear(stoppedAt, locale) })}
            </p>
          )}
        </div>
      </Link>
      <Button variant="secondary" className="h-11 shrink-0 px-4 text-sm" onClick={onContinue}>
        {mode === "dropped" ? t.library.returnButton : t.library.continueButton}
      </Button>
    </div>
  );
}

function SelectedPanel({
  book,
  onStartReading,
}: {
  book: Book;
  onStartReading: (id: string) => void;
}) {
  const { t } = useLocale();
  const formatLabel =
    book.format === "paper" ? t.library.filterFormatPaper : t.library.filterFormatEbook;
  const shelfLabels: Record<BookShelf, string> = {
    reading: t.library.shelfReading,
    want: t.library.shelfWant,
    collection: t.library.shelfCollection,
    done: t.library.shelfDone,
    paused: t.library.shelfPaused,
    dropped: t.library.shelfDropped,
  };
  const statusLabel =
    book.shelf === "want"
      ? book.queue_position === 1
        ? t.library.nextLabel
        : `${book.queue_position ?? ""} ${t.library.positionInQueue}`.trim()
      : shelfLabels[book.shelf];

  return (
    <div className="sticky top-8 rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-hero)]">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.1em] text-accent">{statusLabel}</p>
      <div className="mb-4 flex justify-center">
        <Cover title={book.title} coverUrl={book.cover_url ?? undefined} size="book" />
      </div>
      <h2 className="text-center font-serif text-2xl font-bold text-text">{book.title}</h2>
      {book.author && <p className="mt-1 text-center font-serif text-base text-muted">{book.author}</p>}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Chip>{formatLabel}</Chip>
        {book.total_pages && <Chip>{book.total_pages} {t.book.pagesUnit}</Chip>}
      </div>
      <div className="mt-5 flex flex-col gap-2">
        {book.shelf !== "reading" && book.shelf !== "done" && (
          <Button onClick={() => onStartReading(book.id)}>{t.library.startReading}</Button>
        )}
        <Link href={`/books/${book.id}`}>
          <Button variant="secondary" className="w-full">
            {t.library.openBookPage}
          </Button>
        </Link>
      </div>
    </div>
  );
}
