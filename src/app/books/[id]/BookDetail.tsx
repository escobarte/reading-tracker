"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Cover } from "@/components/ui/Cover";
import { Dropdown } from "@/components/ui/Dropdown";
import { GoalCard } from "@/components/ui/GoalCard";
import { HistoryList } from "@/components/ui/HistoryList";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { StatTile } from "@/components/ui/StatTile";
import { StitchBar } from "@/components/ui/StitchBar";
import { DeadlineDialog } from "@/components/goals/DeadlineDialog";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import { formatCount } from "@/i18n/plural";
import { formatDeadlineDayMonth, formatHoursMinutes } from "@/lib/time";
import type { Book, BookShelf, ReadingSession } from "@/lib/db/types";
import type { ReadingStats } from "@/lib/db/sessions";
import type { DeadlineCardData } from "@/lib/db/goals";
import { continueLastReadingAction, deleteBookAction, moveShelfAction } from "./actions";

type BookDetailProps = {
  book: Book;
  currentPage: number;
  stats: ReadingStats | null;
  sessions: ReadingSession[];
  readingId: string | null;
  deadline: DeadlineCardData | null;
  today: { pages: number; goal: number };
};

export function BookDetail({
  book: initialBook,
  currentPage,
  stats,
  sessions,
  readingId,
  deadline,
  today,
}: BookDetailProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justFinished = searchParams.get("finished") === "1";
  const [book, setBook] = useState(initialBook);
  const [, startTransition] = useTransition();
  const [rereadDialogOpen, setRereadDialogOpen] = useState(false);
  const [deadlineDialogOpen, setDeadlineDialogOpen] = useState(false);
  const canSetDeadline = Boolean(readingId && book.total_pages);

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

  function handleShelfSelect(shelf: BookShelf) {
    if (shelf === "reading" && book.shelf === "done") {
      setRereadDialogOpen(true);
      return;
    }
    handleShelfChange(shelf);
  }

  function handleContinueReading() {
    setRereadDialogOpen(false);
    setBook((prev) => ({ ...prev, shelf: "reading" }));
    startTransition(() => {
      continueLastReadingAction(book.id).then(() => router.refresh());
    });
  }

  function handleRestartReading() {
    setRereadDialogOpen(false);
    handleShelfChange("reading");
  }

  function handleDelete() {
    if (!window.confirm(t.book.deleteConfirm)) return;
    startTransition(() => {
      deleteBookAction(book.id).then(() => router.push("/library"));
    });
  }

  const percent = book.total_pages ? Math.min(100, Math.round((currentPage / book.total_pages) * 100)) : 0;
  const statTimeValue = stats ? formatHoursMinutes(stats.totalMinutes, t.book.hoursUnit, t.book.minutesUnit) : "—";
  const statSessionsValue = stats ? String(stats.sessionCount) : "—";
  const statSpeedValue = stats?.pagesPerHour != null ? String(stats.pagesPerHour) : "—";
  const statAvgValue = stats?.avgSessionMinutes != null ? String(stats.avgSessionMinutes) : "—";

  return (
    <AppShell today={today}>
      <div className="flex items-center justify-between py-5">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label={t.common.back}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
        >
          <Icon name="back" />
        </button>

        <Dropdown
          trigger={<Icon name="more" />}
          triggerLabel={t.book.more}
          align="right"
          showChevron={false}
          triggerClassName="inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
          items={[
            { label: t.book.edit, onSelect: () => router.push(`/books/${book.id}/edit`) },
            { label: t.book.manualSession, onSelect: () => router.push(`/session/manual?book=${book.id}`) },
            { label: t.book.delete, onSelect: handleDelete, variant: "danger" },
          ]}
        />
      </div>

      {justFinished && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border-[1.5px] border-ok bg-surface p-3.5">
          <Icon name="check" width={18} height={18} className="shrink-0 text-ok" />
          <p className="font-serif text-sm font-bold text-ok">{t.book.finishedBanner}</p>
        </div>
      )}

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
          <div className="flex w-full flex-col gap-2">
            {book.shelf === "done" ? (
              <Button className="h-14 w-full gap-2 text-lg" onClick={handleRestartReading}>
                <Icon name="start" width={18} height={18} />
                {t.book.rereadButton}
              </Button>
            ) : (
              <Link href={`/session?book=${book.id}`} className="w-full">
                <Button className="h-14 w-full gap-2 text-lg">
                  <Icon name="start" width={18} height={18} />
                  {t.book.startSession}
                </Button>
              </Link>
            )}
            <Dropdown
              trigger={
                <>
                  <span className="hidden lg:inline">{t.book.shelfLabel} </span>
                  {shelfLabels[book.shelf]}
                </>
              }
              wrapperClassName="relative block w-full"
              triggerClassName="flex h-13 w-full items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-line bg-surface px-4 font-serif text-base text-text"
              items={(["want", "reading", "done", "paused"] as BookShelf[]).map((value) => ({
                label: shelfLabels[value],
                active: book.shelf === value,
                onSelect: () => handleShelfSelect(value),
              }))}
            />
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
              {currentPage}
              {book.total_pages && (
                <span className="text-lg text-muted"> / {book.total_pages} {t.book.pagesUnit} · {percent}%</span>
              )}
            </p>
            <div className="mt-3">
              <StitchBar percent={percent} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <StatTile label={t.book.statTime} value={statTimeValue} />
              <StatTile label={t.book.statSessions} value={statSessionsValue} />
              <StatTile label={t.book.statSpeed} value={statSpeedValue} />
              <StatTile label={t.book.statAvg} value={statAvgValue} />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <GoalCard>
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="font-mono text-xs uppercase tracking-[0.1em] text-deadline">{t.book.deadlineTitle}</p>
                {canSetDeadline && (
                  <button
                    type="button"
                    onClick={() => setDeadlineDialogOpen(true)}
                    className="shrink-0 rounded-lg border-[1.5px] border-dashed border-stitch bg-surface px-4 py-2 font-serif text-sm text-text"
                  >
                    {deadline ? t.book.edit : t.book.deadlineSetButton}
                  </button>
                )}
              </div>

              {!canSetDeadline ? (
                <p className="font-serif text-lg text-muted">{t.book.deadlineNoReading}</p>
              ) : !deadline ? (
                <p className="font-serif text-lg text-muted">{t.book.deadlineNotSet}</p>
              ) : deadline.status === "expired" ? (
                <p className="font-serif text-lg text-deadline">{t.book.deadlineExpired}</p>
              ) : (
                <>
                  <p className="font-serif text-xl font-bold text-text">
                    {formatTemplate(t.book.deadlineUntil, { date: formatDeadlineDayMonth(deadline.dueDate, locale) })}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted">
                    {formatTemplate(t.book.deadlineSubline, {
                      norm: deadline.normPerDay,
                      pagesUnit: t.book.pagesUnit,
                      days: formatCount(deadline.totalDaysInPeriod, "day", locale),
                    })}
                  </p>
                  <div className="mt-2">
                    {deadline.isReadingDay ? (
                      <Chip variant={deadline.status === "on-track" ? "ok" : "default"}>
                        {deadline.status === "on-track"
                          ? t.book.deadlineOnTrack
                          : formatTemplate(t.book.deadlineBehind, {
                              pages: deadline.normPerDay - deadline.doneToday,
                              pagesUnit: t.book.pagesUnit,
                            })}
                      </Chip>
                    ) : (
                      <Chip>{t.book.deadlineNotReadingDay}</Chip>
                    )}
                  </div>
                  {deadline.tomorrowWarningNorm != null && (
                    <p className="mt-2 font-serif text-sm italic text-muted">
                      {formatTemplate(t.book.deadlineWarning, {
                        pages: deadline.tomorrowWarningNorm,
                        pagesUnit: t.book.pagesUnit,
                      })}
                    </p>
                  )}
                </>
              )}
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
            {sessions.length > 0 ? (
              <>
                <HistoryList
                  sessions={sessions}
                  locale={locale}
                  minutesUnit={t.book.historyMinutesUnit}
                  pagesUnit={t.book.pagesUnit}
                  lessThanMinuteLabel={t.common.lessThanMinute}
                />
                <Link
                  href={`/books/${book.id}/history`}
                  className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border-[1.5px] border-dashed border-stitch bg-surface font-mono text-sm text-muted"
                >
                  {formatTemplate(t.book.historyAllLink, {
                    count: formatCount(stats?.sessionCount ?? sessions.length, "session", locale),
                  })}
                </Link>
              </>
            ) : (
              <p className="font-serif text-lg text-muted">{t.book.historyEmpty}</p>
            )}
          </section>
        </div>
      </div>

      {canSetDeadline && readingId && (
        <DeadlineDialog
          open={deadlineDialogOpen}
          onClose={() => setDeadlineDialogOpen(false)}
          bookId={book.id}
          readingId={readingId}
          bookTitle={book.title}
          totalPages={book.total_pages ?? 0}
          currentPage={currentPage}
          initial={deadline ? { dueDateKey: deadline.dueDate, skipWeekdays: deadline.skipWeekdays } : null}
        />
      )}

      <Modal
        open={rereadDialogOpen}
        onClose={() => setRereadDialogOpen(false)}
        titleId="reread-dialog-title"
        title={t.rereadDialog.title}
      >
        <div className="flex flex-col gap-3">
          <Button className="w-full" onClick={handleContinueReading}>
            {t.rereadDialog.continueOption}
          </Button>
          <Button variant="secondary" className="w-full" onClick={handleRestartReading}>
            {t.rereadDialog.restartOption}
          </Button>
          <Button variant="text" className="w-full" onClick={() => setRereadDialogOpen(false)}>
            {t.common.cancel}
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
