"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Cover } from "@/components/ui/Cover";
import { Dropdown } from "@/components/ui/Dropdown";
import { GoalCard } from "@/components/ui/GoalCard";
import { Icon } from "@/components/ui/Icon";
import { StatTile } from "@/components/ui/StatTile";
import { StitchBar } from "@/components/ui/StitchBar";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Book, BookShelf } from "@/lib/db/types";
import { deleteBookAction, moveShelfAction } from "./actions";

export function BookDetail({ book: initialBook }: { book: Book }) {
  const { t } = useLocale();
  const router = useRouter();
  const [book, setBook] = useState(initialBook);
  const [, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  const shelfLabels: Record<BookShelf, string> = {
    reading: t.library.shelfReading,
    want: t.library.shelfWant,
    done: t.library.shelfDone,
    paused: t.library.shelfPaused,
  };
  const formatLabel =
    book.format === "paper" ? t.library.filterFormatPaper : t.library.filterFormatEbook;

  function handleShelfChange(shelf: BookShelf) {
    setBook((prev) => ({ ...prev, shelf }));
    startTransition(() => {
      moveShelfAction(book.id, shelf).then(() => router.refresh());
    });
  }

  function handleDelete() {
    if (!window.confirm(t.book.deleteConfirm)) return;
    startTransition(() => {
      deleteBookAction(book.id).then(() => router.push("/library"));
    });
  }

  const percent = 0;

  return (
    <AppShell>
      <div className="flex items-center justify-between py-5">
        <Link
          href="/library"
          aria-label={t.common.back}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
        >
          <Icon name="back" />
        </Link>

        <div className="relative">
          <button
            type="button"
            aria-label={t.book.more}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
          >
            <Icon name="more" />
          </button>
          {menuOpen && (
            <ul
              role="menu"
              className="absolute right-0 z-10 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-[var(--shadow-cover)]"
            >
              <li role="none">
                <Link
                  role="menuitem"
                  href={`/books/${book.id}/edit`}
                  className="flex min-h-11 w-full items-center px-3 py-2.5 font-serif text-sm text-text hover:bg-surface-2"
                  onClick={() => setMenuOpen(false)}
                >
                  {t.book.edit}
                </Link>
              </li>
              <li role="none">
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleDelete();
                  }}
                  className="flex min-h-11 w-full items-center px-3 py-2.5 text-left font-serif text-sm text-deadline hover:bg-surface-2"
                >
                  {t.book.delete}
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 pb-6 text-center lg:flex-row lg:items-start lg:gap-6 lg:text-left">
        <div className="flex w-full max-w-[340px] shrink-0 flex-col items-center gap-4 text-center lg:items-start lg:rounded-xl lg:border lg:border-line lg:bg-surface lg:p-5 lg:text-left lg:shadow-[var(--shadow-hero)]">
          <Cover title={book.title} coverUrl={book.cover_url ?? undefined} size="book" />
          <div>
            <h1 className="font-serif text-[28px] font-bold leading-[1.15] text-text">{book.title}</h1>
            {book.author && <p className="mt-1 font-serif text-base text-muted">{book.author}</p>}
          </div>
          <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
            <Chip>{formatLabel}</Chip>
            {book.series_number && (
              <Chip>
                {t.book.seriesChip} {book.series_number}
              </Chip>
            )}
            {book.total_pages && (
              <Chip>
                {book.total_pages} {t.book.pagesUnit}
              </Chip>
            )}
            {book.genre && <Chip>{book.genre}</Chip>}
          </div>
          <div className="flex w-full items-center gap-2">
            <Dropdown
              trigger={
                <>
                  <span className="hidden lg:inline">{t.book.shelfLabel} </span>
                  {shelfLabels[book.shelf]}
                </>
              }
              triggerClassName="inline-flex h-14 shrink-0 items-center gap-1.5 rounded-xl border-[1.5px] border-line bg-surface px-4 font-serif text-base text-text"
              items={(["want", "reading", "done", "paused"] as BookShelf[]).map((value) => ({
                label: shelfLabels[value],
                active: book.shelf === value,
                onSelect: () => handleShelfChange(value),
              }))}
            />
            <Link href="/session" className="flex-1">
              <Button className="h-14 w-full gap-2 text-lg">
                <Icon name="start" width={18} height={18} />
                {t.book.startSession}
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4">
          <section className="rounded-xl border border-line bg-surface p-4 lg:p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">
                {t.book.progressTitle}
              </p>
              <p className="font-mono text-xs text-muted">{t.book.progressManual}</p>
            </div>
            <p className="font-mono text-[40px] leading-none text-text">
              0
              {book.total_pages && (
                <span className="text-lg text-muted"> / {book.total_pages} {t.book.pagesUnit} · {percent}%</span>
              )}
            </p>
            <div className="mt-3">
              <StitchBar percent={percent} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <StatTile label={t.book.statTime} value="—" />
              <StatTile label={t.book.statSessions} value="—" />
              <StatTile label={t.book.statSpeed} value="—" />
              <StatTile label={t.book.statAvg} value="—" />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <GoalCard>
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-deadline">
                {t.book.deadlineTitle}
              </p>
              <p className="font-serif text-lg text-muted">{t.book.deadlineEmpty}</p>
            </GoalCard>

            <div className="rounded-xl border border-line bg-surface p-4 lg:p-5">
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-muted">
                {t.book.notesTitle}
              </p>
              <p className="font-serif text-lg text-muted">{t.book.notesEmpty}</p>
            </div>
          </div>

          <section className="rounded-xl border border-line bg-surface p-4 lg:p-5">
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-muted">
              {t.book.historyTitle}
            </p>
            <p className="font-serif text-lg text-muted">{t.book.historyEmpty}</p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
