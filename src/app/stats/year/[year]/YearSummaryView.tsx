"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Cover } from "@/components/ui/Cover";
import { Icon } from "@/components/ui/Icon";
import { StitchBar } from "@/components/ui/StitchBar";
import { YearSpines } from "@/components/ui/YearSpines";
import { StatTile } from "@/components/ui/StatTile";
import { PeriodBars, type PeriodBar } from "@/components/stats/PeriodBars";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import { pluralWord } from "@/i18n/plural";
import type { YearSummaryData } from "@/lib/db/stats";
import { formatDeadlineDayMonth, formatHoursMinutes, localDateKey } from "@/lib/time";

type YearSummaryViewProps = {
  data: YearSummaryData;
  today: { pages: number; goal: number };
};

export function YearSummaryView({ data, today }: YearSummaryViewProps) {
  const { t, locale } = useLocale();
  const {
    year,
    isCurrentYear,
    hasData,
    minYear,
    maxYear,
    goal,
    tiles,
    avgRating,
    longestBook,
    genre,
    booksByMonth,
    bestMonth,
    records,
  } = data;
  const todayKey = localDateKey(new Date());

  const monthBars: PeriodBar[] = booksByMonth.map((count, index) => {
    const monthStartKey = `${year}-${String(index + 1).padStart(2, "0")}-01`;
    return {
      key: String(index),
      label: t.common.monthLetters[index],
      pages: count,
      isCurrent: bestMonth?.monthIndex === index,
      isFuture: monthStartKey > todayKey,
    };
  });

  return (
    <AppShell today={today}>
      <header className="flex items-center gap-4 py-5">
        <Link
          href="/stats"
          aria-label={t.common.back}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
        >
          <Icon name="back" />
        </Link>
        <div className="flex-1">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">{t.yearSummary.kicker}</p>
          <h1 className="font-serif text-[28px] font-bold leading-[1.15] text-text lg:text-[34px]">
            {formatTemplate(t.yearSummary.title, { year })}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/stats/year/${year - 1}`}
            aria-label={t.yearSummary.prevYear}
            aria-disabled={year <= minYear}
            className={`flex h-11 w-11 items-center justify-center font-serif text-xl text-text ${year <= minYear ? "pointer-events-none opacity-30" : ""}`}
          >
            <span aria-hidden="true">‹</span>
          </Link>
          <Link
            href={`/stats/year/${year + 1}`}
            aria-label={t.yearSummary.nextYear}
            aria-disabled={year >= maxYear}
            className={`flex h-11 w-11 items-center justify-center font-serif text-xl text-text ${year >= maxYear ? "pointer-events-none opacity-30" : ""}`}
          >
            <span aria-hidden="true">›</span>
          </Link>
        </div>
      </header>

      {!hasData ? (
        <p className="mt-2 text-center font-serif text-base text-muted">{t.yearSummary.emptyYear}</p>
      ) : (
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3">
          <div className="rounded-xl border-[1.5px] border-dashed border-accent bg-surface p-4 lg:col-span-2 lg:row-start-1 lg:p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.yearSummary.booksTitle}</p>
              {isCurrentYear && <p className="font-mono text-xs text-muted">{t.yearSummary.yearInProgress}</p>}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-mono text-[56px] leading-none text-text">{goal.finished}</span>
              <span className="font-mono text-sm text-muted">
                {formatTemplate(t.yearSummary.booksCount, { goal: goal.goal, unit: pluralWord(goal.goal, "book", locale) })}
              </span>
            </div>
            <div className="mt-3">
              <YearSpines filledCount={goal.finished} total={goal.goal} size="wide" />
            </div>
            <p className="mt-3 font-mono text-xs text-muted">
              {isCurrentYear && goal.daysLeftInYear !== null
                ? formatTemplate(t.yearSummary.untilGoal, {
                    count: Math.max(0, goal.goal - goal.finished),
                    unit: pluralWord(Math.max(0, goal.goal - goal.finished), "book", locale),
                    days: goal.daysLeftInYear,
                    dayUnit: pluralWord(goal.daysLeftInYear, "day", locale),
                  })
                : formatTemplate(t.yearSummary.goalOnly, { goal: goal.goal })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:col-start-3 lg:row-start-1 lg:gap-3">
            <StatTile label={t.yearSummary.tilePages} value={String(tiles.pages)} />
            <StatTile label={t.yearSummary.tileHours} value={String(tiles.hours)} />
            <StatTile
              label={t.yearSummary.tileDaysWithReading}
              value={`${tiles.daysWithReading} ${formatTemplate(t.yearSummary.tileDaysOf, { total: tiles.elapsedDaysInYear, unit: pluralWord(tiles.elapsedDaysInYear, "day", locale) })}`}
            />
            <StatTile label={t.yearSummary.tileSessions} value={String(tiles.sessions)} />
          </div>

          <div className="lg:col-span-3 lg:row-start-2">
            <StatTile label={t.yearSummary.tileAvgRating} value={avgRating != null ? avgRating.toFixed(1) : "—"} />
          </div>

          {longestBook && (
            <div className="rounded-xl border border-line bg-surface p-4 lg:col-start-1 lg:row-start-3 lg:p-5">
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.yearSummary.longestBookTitle}</p>
              <div className="mt-3 flex gap-3">
                <Cover title={longestBook.title} coverUrl={longestBook.coverUrl ?? undefined} size="session" />
                <div className="min-w-0">
                  <p className="font-serif text-xl font-bold leading-tight text-text">{longestBook.title}</p>
                  {longestBook.author && <p className="mt-1 font-serif text-sm text-muted">{longestBook.author}</p>}
                  <p className="mt-1 font-mono text-xs text-muted">
                    {formatTemplate(t.yearSummary.longestBookMeta, {
                      pages: longestBook.totalPages,
                      pageUnit: pluralWord(longestBook.totalPages, "page", locale),
                      days: longestBook.days,
                      dayUnit: pluralWord(longestBook.days, "day", locale),
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {genre ? (
            <div className="rounded-xl border border-line bg-surface p-4 lg:col-start-2 lg:row-start-3 lg:p-5">
              <div className="flex items-baseline justify-between">
                <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.yearSummary.genreTitle}</p>
                <p className="font-mono text-xs text-muted">{t.yearSummary.genreSubtitle}</p>
              </div>
              <p className="mt-2 font-serif text-xl font-bold text-text">
                {genre.groups[0].label}{" "}
                <span className="font-mono text-sm font-normal text-muted">
                  {formatTemplate(t.yearSummary.genreCount, {
                    count: genre.groups[0].count,
                    total: genre.totalBooks,
                    unit: pluralWord(genre.groups[0].count, "book", locale),
                  })}
                </span>
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {genre.groups.map((g, index) => (
                  <div key={g.label} className="flex items-center gap-3">
                    <span className={`w-24 shrink-0 truncate font-serif text-sm ${index === 0 ? "font-bold text-accent" : "text-text"}`}>
                      {g.label}
                    </span>
                    <StitchBar
                      percent={Math.round((g.count / genre.groups[0].count) * 100)}
                      tone={index === 0 ? "accent" : "muted"}
                    />
                    <span className="w-6 shrink-0 text-right font-mono text-sm text-muted">{g.count}</span>
                  </div>
                ))}
              </div>
              {genre.noGenreCount > 0 && (
                <p className="mt-3 font-mono text-xs text-muted">
                  {formatTemplate(t.yearSummary.genreNoneNote, {
                    count: genre.noGenreCount,
                    unit: pluralWord(genre.noGenreCount, "book", locale),
                  })}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-surface p-4 lg:col-start-2 lg:row-start-3 lg:p-5">
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.yearSummary.genreTitle}</p>
              <p className="mt-2 font-serif text-sm text-muted">{t.yearSummary.genreHint}</p>
            </div>
          )}

          <div className="rounded-xl border border-line bg-surface p-4 lg:col-start-3 lg:row-start-3 lg:p-5">
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.yearSummary.recordsTitle}</p>
            <div className="mt-3 flex flex-col">
              <RecordRow
                label={t.yearSummary.recordBestDay}
                value={
                  records.bestDay
                    ? formatTemplate(t.yearSummary.recordBestDayValue, {
                        pages: records.bestDay.pages,
                        unit: pluralWord(records.bestDay.pages, "page", locale),
                      })
                    : t.stats.noData
                }
                date={records.bestDay ? formatDeadlineDayMonth(records.bestDay.dateKey, locale) : undefined}
              />
              <RecordRow
                label={t.yearSummary.recordLongestSession}
                value={
                  records.longestSession
                    ? formatHoursMinutes(records.longestSession.minutes, t.book.hoursUnit, t.book.minutesUnit)
                    : t.stats.noData
                }
                date={records.longestSession ? formatDeadlineDayMonth(records.longestSession.dateKey, locale) : undefined}
              />
              <RecordRow
                label={t.yearSummary.recordBestStreak}
                value={
                  records.bestStreak
                    ? formatTemplate(t.yearSummary.recordBestStreakValue, {
                        days: records.bestStreak.length,
                        unit: pluralWord(records.bestStreak.length, "day", locale),
                      })
                    : t.stats.noData
                }
                date={
                  records.bestStreak?.startKey
                    ? formatTemplate(t.yearSummary.recordStreakSince, {
                        date: formatDeadlineDayMonth(records.bestStreak.startKey, locale),
                      })
                    : undefined
                }
                last
              />
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 lg:col-span-3 lg:row-start-4 lg:p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.yearSummary.byMonthTitle}</p>
              {bestMonth && (
                <p className="font-mono text-xs text-muted">
                  {formatTemplate(t.yearSummary.byMonthBest, { month: t.common.monthNames[bestMonth.monthIndex], count: bestMonth.count })}
                </p>
              )}
            </div>
            <div className="mt-3">
              <PeriodBars bars={monthBars} goal={null} futureValueLabel={t.stats.noData} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function RecordRow({ label, value, date, last }: { label: string; value: string; date?: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-3 ${last ? "" : "border-b-[1.5px] border-dashed border-line"}`}>
      <div>
        <p className="font-serif text-base text-text">{label}</p>
        {date && <p className="font-mono text-xs text-muted">{date}</p>}
      </div>
      <p className="font-mono text-xl text-text">{value}</p>
    </div>
  );
}
