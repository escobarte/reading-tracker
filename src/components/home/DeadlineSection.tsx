"use client";

import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { GoalCard } from "@/components/ui/GoalCard";
import { DeadlineDialog } from "@/components/goals/DeadlineDialog";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import { formatCount } from "@/i18n/plural";
import { formatDeadlineDayMonth } from "@/lib/time";
import type { HomeData, HomeReadingBook } from "@/lib/db/home";

type DeadlineSectionProps = {
  deadline: HomeData["deadline"];
  reading: HomeReadingBook[];
};

/**
 * Единственный слот «Дедлайн» на главной: показывает дедлайн первой (по порядку
 * карусели «Сейчас читаешь») книги, у которой он задан — без синхронизации со
 * свайпом карусели (в макете `home-light.png` блок один, листания нет).
 */
export function DeadlineSection({ deadline, reading }: DeadlineSectionProps) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);

  const fallbackBook = reading.find((book) => book.totalPages) ?? null;
  const target = deadline ? reading.find((book) => book.id === deadline.bookId) ?? fallbackBook : fallbackBook;

  if (!target) {
    return (
      <GoalCard className="h-full">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-deadline">{t.book.deadlineTitle}</p>
        <p className="mt-2 font-serif text-lg text-muted">{t.book.deadlineNoReading}</p>
      </GoalCard>
    );
  }

  return (
    <>
      <GoalCard className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-deadline">{t.book.deadlineTitle}</p>
          {deadline &&
            deadline.status !== "expired" &&
            (deadline.isReadingDay ? (
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
            ))}
        </div>

        {!deadline ? (
          <p className="mt-2 font-serif text-lg text-muted">{t.book.deadlineNotSet}</p>
        ) : deadline.status === "expired" ? (
          <p className="mt-2 font-serif text-lg text-deadline">{t.book.deadlineExpired}</p>
        ) : (
          <>
            <p className="mt-2 font-mono text-[34px] leading-none text-text">
              {deadline.normPerDay} <span className="text-base text-muted">{t.deadlineDialog.normUnit}</span>
            </p>
            <p className="mt-1 font-mono text-xs text-muted">
              {formatTemplate(t.book.deadlineUntilMore, {
                bookTitle: deadline.bookTitle,
                date: formatDeadlineDayMonth(deadline.dueDate, locale),
                days: formatCount(deadline.totalDaysInPeriod, "day", locale),
              })}
            </p>
            {deadline.tomorrowWarningNorm != null && (
              <p className="mt-2 border-t border-dashed border-line pt-2 font-serif text-[15px] italic text-muted">
                {formatTemplate(t.book.deadlineWarning, {
                  pages: deadline.tomorrowWarningNorm,
                  pagesUnit: t.book.pagesUnit,
                })}
              </p>
            )}
          </>
        )}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-auto self-end pt-3 font-serif text-sm text-accent"
        >
          {deadline ? t.book.edit : t.book.deadlineSetButton}
        </button>
      </GoalCard>

      <DeadlineDialog
        open={open}
        onClose={() => setOpen(false)}
        bookId={target.id}
        readingId={target.readingId}
        bookTitle={target.title}
        totalPages={target.totalPages ?? 0}
        currentPage={target.currentPage}
        initial={deadline ? { dueDateKey: deadline.dueDate, skipWeekdays: deadline.skipWeekdays } : null}
      />
    </>
  );
}
