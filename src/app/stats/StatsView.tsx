"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatTile } from "@/components/ui/StatTile";
import { StitchBar } from "@/components/ui/StitchBar";
import { YearSpines } from "@/components/ui/YearSpines";
import { Heatmap } from "@/components/stats/Heatmap";
import { PeriodBars, type PeriodBar } from "@/components/stats/PeriodBars";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import { formatCount, pluralWord } from "@/i18n/plural";
import { weekdayOf } from "@/lib/goals";
import { canGoNext, defaultAnchor, shiftAnchor, type Period } from "@/lib/stats";
import type { StatsBar, StatsData } from "@/lib/db/stats";
import { formatDayRangeCompact, formatHoursMinutes, formatMonthLabel, formatWeekRangeLabel, localDateKey } from "@/lib/time";

type StatsViewProps = {
  data: StatsData;
  today: { pages: number; goal: number };
};

const PERIOD_VALUES: Period[] = ["week", "month", "year", "all"];

export function StatsView({ data, today }: StatsViewProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { period, anchor, range, tiles, heatmap, bars, barsGoal, timeOfDay, hasData, yearGoal } = data;
  const todayKey = localDateKey(new Date());
  const currentYear = Number(todayKey.slice(0, 4));

  function navigate(nextPeriod: Period, nextAnchor: string) {
    const params = new URLSearchParams();
    params.set("p", nextPeriod);
    if (nextAnchor) params.set("d", nextAnchor);
    startTransition(() => {
      router.push(`/stats?${params.toString()}`);
    });
  }

  const nextEnabled = canGoNext(period, anchor, todayKey);

  const periodLabel =
    period === "week" && range
      ? formatWeekRangeLabel(range.startKey, range.endKey, locale)
      : period === "month"
        ? formatMonthLabel(`${anchor}-01`, locale)
        : period === "year"
          ? anchor
          : t.stats.periodAllLabel;

  const segmented = (
    <SegmentedControl<Period>
      aria-label={t.stats.title}
      value={period}
      onChange={(next) => navigate(next, defaultAnchor(next, todayKey))}
      options={PERIOD_VALUES.map((value) => ({
        value,
        label:
          value === "week"
            ? t.stats.periodWeek
            : value === "month"
              ? t.stats.periodMonth
              : value === "year"
                ? t.stats.periodYear
                : t.stats.periodAll,
      }))}
    />
  );

  const periodNav =
    period !== "all" ? (
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t.stats.prevPeriod}
          onClick={() => navigate(period, shiftAnchor(period, anchor, -1))}
          className="flex h-11 w-11 shrink-0 items-center justify-center font-serif text-xl text-text"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <span className="min-w-[150px] text-center font-serif text-lg font-bold text-text lg:min-w-[200px] lg:text-xl">
          {periodLabel}
        </span>
        <button
          type="button"
          aria-label={t.stats.nextPeriod}
          disabled={!nextEnabled}
          onClick={() => navigate(period, shiftAnchor(period, anchor, 1))}
          className="flex h-11 w-11 shrink-0 items-center justify-center font-serif text-xl text-text disabled:opacity-30"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
    ) : null;

  const timeValue = formatHoursMinutes(tiles.minutes, t.book.hoursUnit, t.book.minutesUnit);
  const speedValue = tiles.speedPagesPerHour != null ? String(tiles.speedPagesPerHour) : t.stats.noData;
  const speedUnit = tiles.speedPagesPerHour != null ? t.stats.tileSpeedUnit : undefined;
  const avgValue = tiles.avgMinutes != null ? String(tiles.avgMinutes) : t.stats.noData;
  const avgUnit =
    tiles.avgMinutes != null && tiles.avgPages != null
      ? formatTemplate(t.stats.tileAvgSessionUnit, { pages: tiles.avgPages })
      : undefined;
  const streakValue = formatCount(tiles.streak, "day", locale);

  const calendarSummary = heatmap
    ? formatTemplate(t.stats.calendarSummary, {
        read: heatmap.readDays,
        total: heatmap.totalDays,
        unit: pluralWord(heatmap.totalDays, "day", locale),
      })
    : "";

  const barsTitle = {
    week: t.stats.barsTitleWeek,
    month: t.stats.barsTitleMonth,
    year: t.stats.barsTitleYear,
    all: t.stats.barsTitleAll,
  }[period];

  const periodBars = toPeriodBars(bars, period, locale, t.common.monthLetters, t.home.weekdays);
  const goalLine = barsGoal != null ? { value: barsGoal, label: formatTemplate(t.stats.barsGoal, { goal: barsGoal }) } : null;

  const totalWhenMinutes = timeOfDay.morning + timeOfDay.day + timeOfDay.evening + timeOfDay.night;
  const whenRows = [
    { key: "morning" as const, label: t.stats.whenMorning, captionWord: t.stats.whenCaptionMorning, minutes: timeOfDay.morning },
    { key: "day" as const, label: t.stats.whenDay, captionWord: t.stats.whenCaptionDay, minutes: timeOfDay.day },
    { key: "evening" as const, label: t.stats.whenEvening, captionWord: t.stats.whenCaptionEvening, minutes: timeOfDay.evening },
    { key: "night" as const, label: t.stats.whenNight, captionWord: t.stats.whenCaptionNight, minutes: timeOfDay.night },
  ];
  const peakWhen = totalWhenMinutes > 0 ? whenRows.reduce((best, r) => (r.minutes > best.minutes ? r : best)) : null;

  return (
    <AppShell today={today}>
      <header className="py-5">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">{t.common.appName}</p>
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-serif text-[28px] font-bold leading-[1.15] text-text lg:text-[34px]">{t.stats.title}</h1>
          <div className="hidden items-center gap-6 lg:flex">
            {periodNav}
            {segmented}
          </div>
        </div>
        <div className="mt-4 flex justify-center lg:hidden">{segmented}</div>
        {periodNav && <div className="mt-4 flex justify-center lg:hidden">{periodNav}</div>}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6 lg:gap-4">
        <StatTile label={t.stats.tilePages} value={String(tiles.pages)} />
        <StatTile label={t.stats.tileTime} value={timeValue} />
        <StatTile label={t.stats.tileSpeed} value={speedValue} unit={speedUnit} />
        <StatTile label={t.stats.tileAvgSession} value={avgValue} unit={avgUnit} />
        <StatTile label={t.stats.tileBooksFinished} value={String(tiles.booksFinished)} />
        <StatTile label={t.stats.tileStreak} value={streakValue} highlight />
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:grid lg:grid-cols-3">
        {heatmap && (
          <div className="rounded-xl border border-line bg-surface p-4 lg:col-span-2 lg:row-start-1 lg:p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.stats.calendarTitle}</p>
              <p className="font-mono text-xs text-muted">{calendarSummary}</p>
            </div>
            <div className="mt-3">
              <Heatmap
                weeks={heatmap.weeks}
                weekdayLabels={t.home.weekdays}
                legendLessLabel={t.stats.calendarLegendLess}
                legendMoreLabel={t.stats.calendarLegendMore}
              />
            </div>
          </div>
        )}

        <div
          className={`rounded-xl border-[1.5px] border-dashed border-accent bg-surface p-4 lg:row-start-1 lg:p-5 ${
            heatmap ? "lg:col-start-3" : "lg:col-span-2"
          }`}
        >
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">
              {formatTemplate(t.stats.yearGoalTitle, { year: currentYear })}
            </p>
            <p className="font-mono text-xs text-muted">
              {formatTemplate(t.stats.yearGoalDaysLeft, { days: yearGoal.daysLeftInYear, unit: pluralWord(yearGoal.daysLeftInYear, "day", locale) })}
            </p>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-[40px] leading-none text-text">{yearGoal.finished}</span>
            <span className="font-mono text-sm text-muted">
              {formatTemplate(t.stats.yearGoalCount, { goal: yearGoal.goal, unit: pluralWord(yearGoal.goal, "book", locale) })}
            </span>
          </div>
          <div className="mt-3">
            <YearSpines filledCount={yearGoal.finished} total={yearGoal.goal} />
          </div>
          {period === "year" ? (
            <Link href={`/stats/year/${anchor}`} className="mt-3 block">
              <Button variant="secondary" className="h-12 w-full">
                {t.stats.yearGoalButton}
              </Button>
            </Link>
          ) : (
            <Link
              href={`/stats/year/${currentYear}`}
              className="mt-3 inline-block font-serif text-sm font-bold text-text underline decoration-dashed underline-offset-4"
            >
              {t.stats.yearGoalLinkText}
            </Link>
          )}
        </div>

        <div
          className={`rounded-xl border border-line bg-surface p-4 lg:p-5 ${
            heatmap ? "lg:col-start-3 lg:row-start-2" : "lg:col-start-3 lg:row-start-1"
          }`}
        >
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.stats.whenTitle}</p>
          <div className="mt-3 flex flex-col gap-2.5">
            {whenRows.map((row) => {
              const percent = totalWhenMinutes > 0 ? Math.round((row.minutes / totalWhenMinutes) * 100) : 0;
              const isPeak = peakWhen?.key === row.key;
              return (
                <div key={row.key} className="flex items-center gap-3">
                  <span className={`w-12 shrink-0 font-serif text-sm ${isPeak ? "font-bold text-accent" : "text-text"}`}>
                    {row.label}
                  </span>
                  <StitchBar percent={percent} tone={isPeak ? "accent" : "muted"} />
                  <span className="w-10 shrink-0 text-right font-mono text-xs text-muted">{percent}%</span>
                </div>
              );
            })}
          </div>
          {peakWhen && (
            <p className="mt-3 font-serif text-sm text-muted">
              {formatTemplate(t.stats.whenCaption, { interval: peakWhen.captionWord })}
            </p>
          )}
        </div>

        <div
          className={`rounded-xl border border-line bg-surface p-4 lg:col-span-3 lg:p-5 ${
            heatmap ? "lg:row-start-3" : "lg:row-start-2"
          }`}
        >
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{barsTitle}</p>
          </div>
          <div className="mt-3">
            <PeriodBars bars={periodBars} goal={goalLine} futureValueLabel={t.stats.noData} />
          </div>
        </div>
      </div>

      {!hasData && <p className="mt-4 text-center font-serif text-sm text-muted">{t.stats.emptyPeriod}</p>}
    </AppShell>
  );
}

function toPeriodBars(
  rawBars: StatsBar[],
  period: Period,
  locale: "ru" | "en",
  monthLetters: string[],
  weekdayLabels: string[],
): PeriodBar[] {
  return rawBars.map((bar, index) => {
    let label: string;
    if (period === "week") {
      label = weekdayLabels[weekdayOf(bar.startKey) - 1];
    } else if (period === "month") {
      label = formatDayRangeCompact(bar.startKey, bar.endKey, locale, index === 0);
    } else if (period === "year") {
      label = monthLetters[Number(bar.key.slice(5, 7)) - 1];
    } else {
      label = bar.key;
    }
    return { key: bar.key, label, pages: bar.pages, isCurrent: bar.isCurrent, isFuture: bar.isFuture };
  });
}
