import Link from "next/link";
import { formatHistoryDate } from "@/lib/time";
import type { Locale } from "@/i18n/types";
import type { ReadingSession } from "@/lib/db/types";

type HistoryListProps = {
  sessions: ReadingSession[];
  locale: Locale;
  minutesUnit: string;
  pagesUnit: string;
  lessThanMinuteLabel: string;
};

export function HistoryList({ sessions, locale, minutesUnit, pagesUnit, lessThanMinuteLabel }: HistoryListProps) {
  return (
    <div className="divide-y divide-dashed divide-line">
      {sessions.map((session) => {
        const seconds = session.seconds ?? 0;
        const minutesText =
          seconds > 0 && seconds < 60 ? lessThanMinuteLabel : `${Math.round(seconds / 60)} ${minutesUnit}`;
        return (
          <Link
            key={session.id}
            href={`/sessions/${session.id}/edit`}
            className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-surface-2"
          >
            <div>
              <p className="font-serif text-base font-bold text-text">
                {formatHistoryDate(session.started_at, locale)}
              </p>
              <p className="font-mono text-xs text-muted">
                {minutesText}
                {session.page_from !== null && session.page_to !== null
                  ? ` · ${pagesUnit} ${session.page_from} → ${session.page_to}`
                  : ""}
              </p>
            </div>
            <p className="font-mono text-base text-text">
              {session.pages_read ?? 0} {pagesUnit}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
