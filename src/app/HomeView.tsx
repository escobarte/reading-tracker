"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { StitchRing } from "@/components/ui/StitchRing";
import { WeekBars } from "@/components/ui/WeekBars";
import { YearSpines } from "@/components/ui/YearSpines";
import { CoverRow } from "@/components/home/CoverRow";
import { DeadlineSection } from "@/components/home/DeadlineSection";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import { pluralWord } from "@/i18n/plural";
import { formatHoursMinutes } from "@/lib/time";
import type { HomeData } from "@/lib/db/home";

type HomeViewProps = {
  data: HomeData;
  greeting: string;
  dateLabel: string;
};

export function HomeView({ data, greeting, dateLabel }: HomeViewProps) {
  const { t, locale } = useLocale();

  const todayPercent = data.today.goal > 0 ? Math.min(100, Math.round((data.today.pages / data.today.goal) * 100)) : 0;
  const todayGoalMet = data.today.pages >= data.today.goal;

  const weekTime = formatHoursMinutes(data.week.totalMinutes, t.book.hoursUnit, t.book.minutesUnit);

  return (
    <AppShell today={{ pages: data.today.pages, goal: data.today.goal }}>
      <header className="flex items-start justify-between gap-3 py-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent lg:hidden">
            {t.common.appName}
          </p>
          <p className="hidden font-mono text-xs uppercase tracking-[0.14em] text-accent lg:block">{dateLabel}</p>
          <h1 className="font-serif text-[28px] font-bold leading-[1.15] text-text lg:text-[34px]">{greeting}</h1>
          <p className="font-mono text-xs text-muted lg:hidden">{dateLabel}</p>
        </div>
        <Link
          href="/settings"
          aria-label={t.home.settings}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text lg:hidden"
        >
          <Icon name="settings" />
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-4 pb-10 lg:grid-cols-3 lg:gap-6">
        <div className="order-1 lg:order-1 lg:col-span-2">
          <HeroCarousel books={data.reading} />
        </div>

        <div className="order-2 grid grid-cols-2 gap-3 lg:order-2 lg:col-span-1 lg:flex lg:flex-col">
          <Card className="lg:flex lg:flex-1 lg:flex-col lg:justify-center">
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.home.todayTitle}</p>
            <div className="mt-2 flex items-center justify-center">
              <StitchRing percent={todayPercent} size="sm">
                <span className="font-mono text-2xl text-text">{data.today.pages}</span>
              </StitchRing>
            </div>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center font-mono text-xs text-muted">
              {todayGoalMet && <Icon name="check" width={14} height={14} className="text-ok" />}
              {formatTemplate(t.home.todayCaption, {
                goal: data.today.goal,
                pagesUnit: t.book.pagesUnit,
                minutes: data.today.minutes,
                minuteUnit: t.session.minuteUnit,
              })}
            </p>
          </Card>

          <Card className="lg:flex lg:flex-1 lg:flex-col lg:justify-center">
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.home.streakTitle}</p>
            <p className="mt-2 text-center font-mono text-[34px] leading-none text-text">{data.streak}</p>
            <p className="mt-2 text-center font-mono text-xs text-muted">
              {formatTemplate(t.home.streakCaption, { dayWord: pluralWord(data.streak, "day", locale) })}
            </p>
          </Card>
        </div>

        <div className="order-3 lg:order-3 lg:col-span-1">
          <DeadlineSection deadline={data.deadline} reading={data.reading} />
        </div>

        <div className="order-5 lg:order-4 lg:col-span-1">
          <Card className="h-full">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted">{t.home.weekTitle}</p>
              <p className="font-mono text-xs text-muted">
                {formatTemplate(t.home.weekSummary, {
                  pages: data.week.totalPages,
                  goal: data.week.goalPages,
                  pagesUnit: t.book.pagesUnit,
                  time: weekTime,
                })}
              </p>
            </div>
            <WeekBars
              days={data.week.days}
              goalPerDay={data.today.goal}
              goalLabel={formatTemplate(t.home.weekGoalLabel, { goal: data.today.goal })}
              weekdayLabels={t.home.weekdays}
              futureValueLabel="—"
            />
          </Card>
        </div>

        <div className="order-6 lg:order-5 lg:col-span-1">
          <Card className="h-full">
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-muted">{t.home.yearTitle}</p>
            <p className="font-mono text-[34px] leading-none text-text">
              {data.year.finishedCount}
              <span className="text-base text-muted">
                {" "}
                {formatTemplate(t.home.yearCaption, { goal: data.year.goal })}
              </span>
            </p>
            <div className="mt-3">
              <YearSpines filledCount={data.year.finishedCount} total={data.year.goal} />
            </div>
          </Card>
        </div>

        <div className="order-4 lg:order-6 lg:col-span-2">
          <section className="h-full rounded-xl border border-line bg-surface p-4 lg:p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted">{t.home.queueTitle}</p>
              {data.queue.length > 0 && (
                <Link href="/library?shelf=want" className="font-mono text-xs text-accent">
                  {t.home.queueAllLink} →
                </Link>
              )}
            </div>
            {data.queue.length > 0 ? (
              <CoverRow
                items={data.queue.map((book) => ({
                  id: book.id,
                  title: book.title,
                  author: book.author,
                  coverUrl: book.coverUrl,
                  badge: book.position,
                }))}
                hrefFor={(id) => `/books/${id}`}
                badgeLabel={(badge) => formatTemplate(t.home.queuePosition, { position: badge })}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="font-serif text-base text-muted">{t.home.queueEmpty}</p>
                <Link href="/library/add" className="font-mono text-xs text-accent underline-offset-4 hover:underline">
                  {t.library.addBook}
                </Link>
              </div>
            )}
          </section>
        </div>

        <div className="order-8 lg:order-7 lg:col-span-1">
          <section className="h-full rounded-xl border border-line bg-surface p-4 lg:p-5">
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-muted">{t.home.recentTitle}</p>
            {data.recent.length > 0 ? (
              <CoverRow items={data.recent} hrefFor={(id) => `/books/${id}`} />
            ) : (
              <p className="py-4 text-center font-serif text-base text-muted">{t.home.recentEmpty}</p>
            )}
          </section>
        </div>

        <div className="order-7 lg:order-8 lg:col-span-3">
          <Card>
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.home.quoteTitle}</p>
            <p className="font-serif text-lg italic text-muted lg:text-2xl">{t.book.deadlineEmpty}</p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
