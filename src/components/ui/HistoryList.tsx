import { formatHistoryDate } from "@/lib/time";
import type { Locale } from "@/i18n/types";
import type { ReadingSession } from "@/lib/db/types";

type HistoryListProps = {
  sessions: ReadingSession[];
  locale: Locale;
  minutesUnit: string;
  pagesUnit: string;
};

export function HistoryList({ sessions, locale, minutesUnit, pagesUnit }: HistoryListProps) {
  return (
    <div className="divide-y divide-dashed divide-line">
      {sessions.map((session) => {
        const minutes = session.seconds ? Math.round(session.seconds / 60) : 0;
        return (
          <div key={session.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div>
              <p className="font-serif text-base font-bold text-text">
                {formatHistoryDate(session.started_at, locale)}
              </p>
              <p className="font-mono text-xs text-muted">
                {minutes} {minutesUnit}
                {session.page_from !== null && session.page_to !== null
                  ? ` · ${pagesUnit} ${session.page_from} → ${session.page_to}`
                  : ""}
              </p>
            </div>
            <p className="font-mono text-base text-text">
              {session.pages_read ?? 0} {pagesUnit}
            </p>
          </div>
        );
      })}
    </div>
  );
}
