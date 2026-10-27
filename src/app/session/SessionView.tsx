"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Cover } from "@/components/ui/Cover";
import { Icon } from "@/components/ui/Icon";
import { StitchRing } from "@/components/ui/StitchRing";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import { DEFAULT_DAILY_PAGES_GOAL } from "@/lib/goals";
import { formatClock } from "@/lib/time";
import {
  clearActiveSession,
  elapsedSeconds,
  readActiveSession,
  writeActiveSession,
  type ActiveSession,
} from "@/lib/active-session";
import type { Book } from "@/lib/db/types";
import { getBookAction, getTodayProgressAction, prepareSessionAction } from "./actions";

type Phase =
  | { kind: "loading" }
  | { kind: "picker" }
  | { kind: "conflict"; activeSession: ActiveSession; activeBook: Book; requestedBook: Book | null }
  | { kind: "running"; session: ActiveSession; book: Book };

type SessionViewProps = {
  books: Book[];
  readingBooks: Book[];
  queueBooks: Book[];
};

export function SessionView({ books, readingBooks, queueBooks }: SessionViewProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [startingBookId, setStartingBookId] = useState<string | null>(null);
  const [todayPages, setTodayPages] = useState(0);
  const [todayGoal, setTodayGoal] = useState(DEFAULT_DAILY_PAGES_GOAL);
  const [now, setNow] = useState(() => Date.now());

  const resolveBook = useCallback(
    async (bookId: string): Promise<Book | null> => {
      const local = books.find((b) => b.id === bookId);
      if (local) return local;
      return getBookAction(bookId);
    },
    [books],
  );

  const startNewSession = useCallback(async (book: Book) => {
    setStartingBookId(book.id);
    try {
      const { readingId, startPage } = await prepareSessionAction(book.id);
      const session: ActiveSession = {
        bookId: book.id,
        readingId,
        startedAt: new Date().toISOString(),
        startPage,
        pausedAt: null,
        pausedTotalMs: 0,
      };
      writeActiveSession(session);
      setPhase({ kind: "running", session, book });
    } finally {
      setStartingBookId(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const requestedId = new URLSearchParams(window.location.search).get("book");
    const stored = readActiveSession();

    async function init() {
      if (stored) {
        const activeBook = await resolveBook(stored.bookId);
        if (cancelled) return;
        if (!activeBook) {
          clearActiveSession();
        } else if (!requestedId || requestedId === stored.bookId) {
          setPhase({ kind: "running", session: stored, book: activeBook });
          return;
        } else {
          const requestedBook = await resolveBook(requestedId);
          if (cancelled) return;
          setPhase({ kind: "conflict", activeSession: stored, activeBook, requestedBook });
          return;
        }
      }

      if (requestedId) {
        const book = await resolveBook(requestedId);
        if (cancelled) return;
        if (book) {
          await startNewSession(book);
          return;
        }
      }

      if (readingBooks.length === 1) {
        await startNewSession(readingBooks[0]);
        return;
      }

      if (!cancelled) setPhase({ kind: "picker" });
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- определяем экран один раз при монтировании
  }, []);

  useEffect(() => {
    if (phase.kind !== "running") return;
    let cancelled = false;
    getTodayProgressAction().then((progress) => {
      if (!cancelled) {
        setTodayPages(progress.pages);
        setTodayGoal(progress.goal);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [phase.kind]);

  const pausedAt = phase.kind === "running" ? phase.session.pausedAt : undefined;
  useEffect(() => {
    if (phase.kind !== "running" || pausedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    function handleVisibility() {
      if (document.visibilityState === "visible") setNow(Date.now());
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [phase.kind, pausedAt]);

  function handlePause() {
    if (phase.kind !== "running") return;
    const updated: ActiveSession = { ...phase.session, pausedAt: new Date().toISOString() };
    writeActiveSession(updated);
    setPhase({ kind: "running", session: updated, book: phase.book });
  }

  function handleResume() {
    if (phase.kind !== "running" || !phase.session.pausedAt) return;
    const pausedMs = Date.now() - new Date(phase.session.pausedAt).getTime();
    const updated: ActiveSession = {
      ...phase.session,
      pausedAt: null,
      pausedTotalMs: phase.session.pausedTotalMs + pausedMs,
    };
    writeActiveSession(updated);
    setNow(Date.now());
    setPhase({ kind: "running", session: updated, book: phase.book });
  }

  function handleFinish() {
    if (phase.kind !== "running") return;
    const updated: ActiveSession = {
      ...phase.session,
      pausedAt: phase.session.pausedAt ?? new Date().toISOString(),
    };
    writeActiveSession(updated);
    router.push("/session/finish");
  }

  if (phase.kind === "loading") {
    return <AppShell variant="focused" />;
  }

  if (phase.kind === "conflict") {
    const { activeBook, requestedBook } = phase;
    return (
      <AppShell variant="focused">
        <PageHeader title={t.session.conflictTitle} />
        <div className="flex flex-col items-center gap-5 pt-4 text-center">
          <p className="font-serif text-lg text-text">
            {formatTemplate(t.session.conflictBody, { title: activeBook.title })}
          </p>
          <div className="flex w-full flex-col gap-3">
            <Button
              className="w-full"
              onClick={() => setPhase({ kind: "running", session: phase.activeSession, book: activeBook })}
            >
              {t.session.conflictContinue}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                clearActiveSession();
                if (requestedBook) startNewSession(requestedBook);
                else setPhase({ kind: "picker" });
              }}
            >
              {t.session.conflictDiscard}
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (phase.kind === "picker") {
    const hasBooks = readingBooks.length > 0 || queueBooks.length > 0;
    return (
      <AppShell variant="focused">
        <PageHeader
          title={t.session.pickerTitle}
          action={
            <Link
              href="/"
              aria-label={t.common.back}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
            >
              <Icon name="back" />
            </Link>
          }
        />
        {readingBooks.length > 0 && (
          <section className="flex flex-col gap-2 pb-6">
            <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
              {t.session.pickerReadingSection}
            </h2>
            {readingBooks.map((book) => (
              <PickerRow
                key={book.id}
                book={book}
                pending={startingBookId === book.id}
                onSelect={() => startNewSession(book)}
                manualHref={`/session/manual?book=${book.id}`}
                manualLabel={t.session.pickerManualLink}
              />
            ))}
          </section>
        )}
        {queueBooks.length > 0 && (
          <section className="flex flex-col gap-2 pb-6">
            <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
              {t.session.pickerQueueSection}
            </h2>
            {queueBooks.map((book) => (
              <PickerRow
                key={book.id}
                book={book}
                pending={startingBookId === book.id}
                onSelect={() => startNewSession(book)}
                manualHref={`/session/manual?book=${book.id}`}
                manualLabel={t.session.pickerManualLink}
              />
            ))}
          </section>
        )}
        {!hasBooks && (
          <p className="py-6 text-center font-serif text-muted">{t.session.pickerEmpty}</p>
        )}
        <Link
          href="/library/add"
          className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-stitch bg-surface font-serif text-base text-text"
        >
          <Icon name="plus" width={20} height={20} />
          {t.library.addBook}
        </Link>
      </AppShell>
    );
  }

  const { session, book } = phase;
  const elapsed = elapsedSeconds(session, now);
  const minuteOfHour = (elapsed / 60) % 60;
  const ringPercent = (minuteOfHour / 60) * 100;
  const isPaused = Boolean(session.pausedAt);
  const remainingPages = book.total_pages ? Math.max(0, book.total_pages - session.startPage) : null;

  return (
    <AppShell
      variant="focused"
      footer={
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={isPaused ? t.session.resumeLabel : t.session.pauseLabel}
            onClick={isPaused ? handleResume : handlePause}
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
          >
            <Icon name={isPaused ? "start" : "pause"} />
          </button>
          <Button onClick={handleFinish} className="h-14 flex-1 gap-2 text-lg">
            <Icon name="stop" width={18} height={18} />
            {t.session.finishLabel}
          </Button>
        </div>
      }
    >
      <div className="flex items-center justify-between pb-6">
        <button
          type="button"
          aria-label={t.common.close}
          onClick={() => router.push(`/books/${book.id}`)}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
        >
          <Icon name="chevron-down" />
        </button>
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-accent">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          {t.session.live}
        </p>
        <Link
          href="/"
          aria-label={t.nav.home}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
        >
          <Icon name="home" />
        </Link>
      </div>

      <div className="flex items-center gap-4 pb-6">
        <Cover title={book.title} coverUrl={book.cover_url ?? undefined} size="session" />
        <div className="min-w-0">
          <h1 className="font-serif text-2xl font-bold leading-[1.15] text-text">{book.title}</h1>
          {book.author && (
            <p className="font-serif text-sm text-muted">
              {book.author}
              {book.series_number ? ` · ${t.book.seriesChip} ${book.series_number}` : ""}
            </p>
          )}
          <p className="mt-1 font-mono text-xs text-muted">
            {formatTemplate(t.session.startedFromPage, { page: session.startPage })}
          </p>
          {remainingPages !== null && (
            <p className="font-mono text-xs text-muted">
              {formatTemplate(t.session.toEndPages, { pages: remainingPages })}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 pb-6">
        <StitchRing percent={ringPercent} size="lg">
          <div className="flex flex-col items-center">
            <span className="font-mono text-[44px] leading-none text-text">{formatClock(elapsed)}</span>
            <span className="mt-1 font-serif text-sm text-muted">{t.session.elapsedLabel}</span>
          </div>
        </StitchRing>
      </div>

      <p className="pb-6 text-center font-mono text-sm text-muted">
        {formatTemplate(t.session.todayBeforeSession, { read: todayPages, goal: todayGoal })}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/notes"
          className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-stitch bg-surface font-serif text-base text-text"
        >
          <Icon name="quote" width={20} height={20} />
          {t.session.addQuote}
        </Link>
        <Link
          href="/notes"
          className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-stitch bg-surface font-serif text-base text-text"
        >
          <Icon name="camera" width={20} height={20} />
          {t.session.addPhoto}
        </Link>
      </div>
    </AppShell>
  );
}

function PickerRow({
  book,
  pending,
  onSelect,
  manualHref,
  manualLabel,
}: {
  book: Book;
  pending: boolean;
  onSelect: () => void;
  manualHref: string;
  manualLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
      <button
        type="button"
        onClick={onSelect}
        disabled={pending}
        className="flex flex-1 items-center gap-3 text-left disabled:opacity-50"
      >
        <Cover title={book.title} coverUrl={book.cover_url ?? undefined} size="row" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-base font-bold text-text">{book.title}</p>
          {book.author && <p className="truncate font-serif text-sm text-muted">{book.author}</p>}
        </div>
      </button>
      <Link
        href={manualHref}
        onClick={(event) => event.stopPropagation()}
        className="inline-flex min-h-11 w-20 shrink-0 items-center justify-end text-right font-mono text-[11px] leading-tight text-muted underline-offset-4 hover:underline"
      >
        {manualLabel}
      </Link>
    </div>
  );
}
