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
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
import type { Book, BookFormat, BookShelf } from "@/lib/db/types";
import { moveShelfAction, reorderQueueAction } from "./actions";

const SHELVES: BookShelf[] = ["reading", "want", "done", "paused"];
type SortMode = "queue" | "title" | "author";

export function LibraryView({ initialBooks }: { initialBooks: Book[] }) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [books, setBooks] = useState(initialBooks);
  const [shelf, setShelf] = useState<BookShelf>("reading");
  const [format, setFormat] = useState<"all" | BookFormat>("all");
  const [sortMode, setSortMode] = useState<SortMode>("queue");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const shelfLabels: Record<BookShelf, string> = {
    reading: t.library.shelfReading,
    want: t.library.shelfWant,
    done: t.library.shelfDone,
    paused: t.library.shelfPaused,
  };
  const formatLabels: Record<BookFormat, string> = {
    paper: t.library.filterFormatPaper,
    ebook: t.library.filterFormatEbook,
  };

  const counts = useMemo(() => {
    const result: Record<BookShelf, number> = { reading: 0, want: 0, done: 0, paused: 0 };
    for (const book of books) result[book.shelf] += 1;
    return result;
  }, [books]);

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

  const selectedBook = books.find((book) => book.id === selectedId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const wantBooks = books
      .filter((book) => book.shelf === "want")
      .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0));
    const oldIndex = wantBooks.findIndex((book) => book.id === active.id);
    const newIndex = wantBooks.findIndex((book) => book.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

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
  }

  function handleStartReading(id: string) {
    setBooks((prev) => prev.map((book) => (book.id === id ? { ...book, shelf: "reading" } : book)));
    startTransition(() => {
      moveShelfAction(id, "reading").then(() => router.refresh());
    });
  }

  return (
    <AppShell>
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

      <div className="flex flex-wrap items-center gap-2 pb-4">
        {SHELVES.map((value) => (
          <Pill key={value} active={shelf === value} count={counts[value]} onClick={() => setShelf(value)}>
            {shelfLabels[value]}
          </Pill>
        ))}
      </div>

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
          {visibleBooks.length} {t.library.booksCount}
        </span>
      </div>

      {visibleBooks.length === 0 ? (
        <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-stitch bg-surface p-8 text-center">
          <p className="font-serif text-lg font-bold text-text">{t.library.empty}</p>
          <Link href="/library/add">
            <Button>{t.library.emptyCta}</Button>
          </Link>
        </div>
      ) : (
        <div className="flex gap-6">
          <div className="flex-1 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
            {isQueueView ? (
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext items={visibleBooks.map((book) => book.id)} strategy={verticalListSortingStrategy}>
                  {visibleBooks.map((book, index) => (
                    <RowLink key={book.id} book={book} shelf={shelf} onSelect={setSelectedId} selected={selectedId === book.id}>
                      <SortableBookRow
                        book={book}
                        position={index + 1}
                        isNext={index === 0}
                        selected={selectedId === book.id}
                        nextLabel={t.library.nextLabel}
                        formatLabel={formatLabels[book.format]}
                        dragLabel={t.library.dragLabel}
                      />
                    </RowLink>
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              visibleBooks.map((book) => (
                <RowLink key={book.id} book={book} shelf={shelf} onSelect={setSelectedId} selected={selectedId === book.id}>
                  <BookRow book={book} formatLabel={formatLabels[book.format]} selected={selectedId === book.id} />
                </RowLink>
              ))
            )}
          </div>

          {selectedBook && (
            <aside className="hidden w-[320px] shrink-0 lg:block">
              <SelectedPanel book={selectedBook} onStartReading={handleStartReading} />
            </aside>
          )}
        </div>
      )}
    </AppShell>
  );
}

function RowLink({
  book,
  selected,
  onSelect,
  children,
}: {
  book: Book;
  shelf: BookShelf;
  selected: boolean;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/books/${book.id}`}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        if (window.matchMedia("(min-width: 1024px)").matches) {
          event.preventDefault();
          onSelect(book.id);
        }
      }}
      className="mb-2 block lg:mb-0"
      aria-current={selected ? "true" : undefined}
    >
      {children}
    </Link>
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

  return (
    <div className="sticky top-8 rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-hero)]">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.1em] text-accent">
        {book.shelf === "want" ? t.library.nextLabel : book.shelf}
      </p>
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
