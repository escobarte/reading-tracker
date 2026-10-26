"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { HistoryList } from "@/components/ui/HistoryList";
import { Icon } from "@/components/ui/Icon";
import { StatTile } from "@/components/ui/StatTile";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import { formatHoursMinutes, formatMonthLabel, formatShortDate, localMonthKey } from "@/lib/time";
import type { Book, Reading, ReadingSession } from "@/lib/db/types";
import type { ReadingStats } from "@/lib/db/sessions";

type HistoryPageViewProps = {
  book: Book;
  readings: Reading[];
  selectedReadingId: string | null;
  sessions: ReadingSession[];
  stats: ReadingStats | null;
};

export function HistoryPageView({ book, readings, selectedReadingId, sessions, stats }: HistoryPageViewProps) {
  const { t, locale } = useLocale();

  const totalPages = sessions.reduce((sum, s) => sum + (s.pages_read ?? 0), 0);
  const timeValue = stats ? formatHoursMinutes(stats.totalMinutes, t.book.hoursUnit, t.book.minutesUnit) : "—";

  const groups: { key: string; label: string; sessions: ReadingSession[] }[] = [];
  for (const session of sessions) {
    const key = localMonthKey(session.started_at);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label: formatMonthLabel(session.started_at, locale), sessions: [] };
      groups.push(group);
    }
    group.sessions.push(session);
  }

  return (
    <AppShell variant="narrow">
      <header className="flex items-center gap-4 py-5">
        <Link
          href={`/books/${book.id}`}
          aria-label={t.common.back}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
        >
          <Icon name="back" />
        </Link>
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{book.title}</p>
          <h1 className="font-serif text-[28px] font-bold leading-[1.15] text-text lg:text-[34px]">
            {t.history.title}
          </h1>
        </div>
      </header>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <StatTile label={t.book.statSessions} value={String(stats?.sessionCount ?? sessions.length)} />
        <StatTile label={t.history.statPages} value={String(totalPages)} />
        <StatTile label={t.book.statTime} value={timeValue} />
      </div>

      {readings.length > 1 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {readings.map((reading, index) => {
            const active = reading.id === selectedReadingId;
            return (
              <Link
                key={reading.id}
                href={`/books/${book.id}/history?reading=${reading.id}`}
                className={`inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-4 font-serif text-sm transition-colors ${
                  active ? "bg-accent font-bold text-accent-on" : "border border-line bg-surface text-muted"
                }`}
              >
                {formatTemplate(t.history.readingLabel, { n: index + 1 })}
                {reading.started_at ? ` · ${formatShortDate(reading.started_at, locale)}` : ""}
              </Link>
            );
          })}
        </div>
      )}

      {groups.length === 0 ? (
        <p className="py-6 text-center font-serif text-muted">{t.book.historyEmpty}</p>
      ) : (
        <div className="flex flex-col gap-5 pb-10">
          {groups.map((group) => (
            <section key={group.key}>
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-muted">{group.label}</p>
              <div className="rounded-xl border border-line bg-surface p-4">
                <HistoryList
                  sessions={group.sessions}
                  locale={locale}
                  minutesUnit={t.book.historyMinutesUnit}
                  pagesUnit={t.book.pagesUnit}
                  lessThanMinuteLabel={t.common.lessThanMinute}
                />
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
