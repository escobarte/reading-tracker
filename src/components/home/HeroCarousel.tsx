"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Cover } from "@/components/ui/Cover";
import { HeroCard } from "@/components/ui/HeroCard";
import { Icon } from "@/components/ui/Icon";
import { StitchBar } from "@/components/ui/StitchBar";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import { formatClock } from "@/lib/time";
import { elapsedSeconds, readActiveSession, type ActiveSession } from "@/lib/active-session";
import type { HomeReadingBook } from "@/lib/db/home";

export function HeroCarousel({ books }: { books: HomeReadingBook[] }) {
  const { t } = useLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setActiveSession(readActiveSession());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeSession) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeSession]);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;
    function onScroll() {
      const slideWidth = node!.clientWidth || 1;
      const index = Math.round(node!.scrollLeft / slideWidth);
      setActiveIndex(Math.min(books.length - 1, Math.max(0, index)));
    }
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [books.length]);

  function scrollToIndex(index: number) {
    const node = trackRef.current;
    if (!node) return;
    const clamped = Math.min(books.length - 1, Math.max(0, index));
    node.scrollTo({ left: clamped * node.clientWidth, behavior: "smooth" });
    setActiveIndex(clamped);
  }

  if (books.length === 0) {
    return (
      <section>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.home.readingTitle}</p>
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-stitch bg-surface p-8 text-center">
          <p className="font-serif text-lg font-bold text-text">{t.home.emptyReadingTitle}</p>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/library?shelf=want">
              <Button variant="secondary" className="w-full sm:w-auto">
                {t.home.emptyPickQueue}
              </Button>
            </Link>
            <Link href="/library/add">
              <Button className="w-full sm:w-auto">{t.library.addBook}</Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      role="group"
      aria-roledescription="carousel"
      aria-label={t.home.readingTitle}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") scrollToIndex(activeIndex + 1);
        if (event.key === "ArrowLeft") scrollToIndex(activeIndex - 1);
      }}
      className="lg:flex lg:h-full lg:flex-col"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.home.readingTitle}</p>
        {books.length > 1 && (
          <p className="font-mono text-xs text-muted">
            {formatTemplate(t.home.readingCounter, { current: activeIndex + 1, total: books.length })}
          </p>
        )}
      </div>

      <div className="relative lg:flex-1">
        {books.length > 1 && (
          <>
            <button
              type="button"
              aria-label={t.home.prevBook}
              disabled={activeIndex === 0}
              onClick={() => scrollToIndex(activeIndex - 1)}
              className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text disabled:opacity-40 lg:flex"
            >
              <Icon name="back" width={18} height={18} />
            </button>
            <button
              type="button"
              aria-label={t.home.nextBook}
              disabled={activeIndex === books.length - 1}
              onClick={() => scrollToIndex(activeIndex + 1)}
              className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text disabled:opacity-40 lg:flex"
            >
              <Icon name="back" width={18} height={18} className="rotate-180" />
            </button>
          </>
        )}

        <div
          ref={trackRef}
          tabIndex={0}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 lg:h-full [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {books.map((book) => (
            <div key={book.id} className="w-full shrink-0 snap-center">
              <HeroSlide
                book={book}
                isSessionActive={activeSession?.bookId === book.id}
                activeSession={activeSession?.bookId === book.id ? activeSession : null}
                now={now}
              />
            </div>
          ))}
        </div>
      </div>

      {books.length > 1 && (
        <div role="tablist" aria-label={t.home.readingTitle} className="mt-3 flex justify-center gap-2">
          {books.map((book, index) => (
            <button
              key={book.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={formatTemplate(t.home.readingCounter, { current: index + 1, total: books.length })}
              onClick={() => scrollToIndex(index)}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                index === activeIndex ? "bg-accent" : "bg-stitch opacity-50"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function HeroSlide({
  book,
  isSessionActive,
  activeSession,
  now,
}: {
  book: HomeReadingBook;
  isSessionActive: boolean;
  activeSession: ActiveSession | null;
  now: number;
}) {
  const { t } = useLocale();
  const formatLabel = book.format === "paper" ? t.library.filterFormatPaper : t.library.filterFormatEbook;
  const remainingPages = book.totalPages ? Math.max(0, book.totalPages - book.currentPage) : null;

  return (
    <HeroCard className="lg:h-full">
      <Link href={`/books/${book.id}`} className="flex gap-4">
        <Cover title={book.title} coverUrl={book.coverUrl ?? undefined} size="hero" />
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-xl font-bold leading-[1.15] text-text lg:text-2xl">{book.title}</h2>
          {book.author && <p className="mt-1 truncate font-serif text-sm text-muted">{book.author}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip>{formatLabel}</Chip>
          </div>
          <p className="mt-3 font-mono text-[28px] leading-none text-text lg:text-[32px]">
            {book.currentPage}
            {book.totalPages && (
              <span className="text-base text-muted">
                {" "}
                / {book.totalPages} {t.book.pagesUnit}
              </span>
            )}
          </p>
        </div>
      </Link>

      <div className="mt-3">
        <StitchBar percent={book.percent} label={`${book.percent}%`} />
      </div>
      {remainingPages !== null && (
        <p className="mt-2 font-mono text-xs text-muted">
          {formatTemplate(t.book.progressRemaining, { pages: remainingPages })}
        </p>
      )}

      <div aria-hidden="true" className="hidden lg:block lg:flex-1" />

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {isSessionActive && activeSession ? (
          <Link href="/session" className="flex-1">
            <Button className="h-14 w-full gap-2 text-lg">
              <Icon name="start" width={18} height={18} />
              {t.home.continueSession} · {formatClock(elapsedSeconds(activeSession, now))}
            </Button>
          </Link>
        ) : (
          <Link href={`/session?book=${book.id}`} className="flex-1">
            <Button className="h-14 w-full gap-2 text-lg">
              <Icon name="start" width={18} height={18} />
              {t.book.startSession}
            </Button>
          </Link>
        )}
        <Link href={`/books/${book.id}`} className="hidden lg:block">
          <Button variant="secondary" className="h-14">
            {t.home.bookPageLink}
          </Button>
        </Link>
      </div>
    </HeroCard>
  );
}
