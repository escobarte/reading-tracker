import type { ReactNode } from "react";
import { PlanSpines } from "@/components/ui/PlanSpines";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import type { YearPlan } from "@/lib/db/books";

type YearPlanCardProps = {
  plan: YearPlan;
  year: number;
  /** "full" — главная и итоги текущего года (две плитки); "compact" — карточка на странице статистики (одна плитка). */
  variant?: "full" | "compact";
  headerRight?: ReactNode;
  emptyAction?: ReactNode;
};

export function YearPlanCard({ plan, year, variant = "full", headerRight, emptyAction }: YearPlanCardProps) {
  const { t } = useLocale();
  const total = plan.books.length;

  return (
    <>
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">
          {formatTemplate(t.home.yearTitle, { year })}
        </p>
        {headerRight}
      </div>

      {total === 0 ? (
        <>
          <p className="mt-3 font-serif text-base text-muted">{t.home.yearEmpty}</p>
          {emptyAction}
        </>
      ) : (
        <>
          <div className={`mt-3 grid gap-3 ${variant === "full" ? "grid-cols-2" : "grid-cols-1"}`}>
            <div>
              <p className="font-mono text-[26px] leading-none text-text">{total}</p>
              <p className="font-mono text-xs text-muted">{t.home.yearBooksInPlan}</p>
            </div>
            {variant === "full" && (
              <div>
                <p className="font-mono text-[26px] leading-none text-text">{plan.totalPages}</p>
                <p className="font-mono text-xs text-muted">{t.home.yearPagesTotal}</p>
              </div>
            )}
          </div>
          <div className="mt-4">
            <PlanSpines books={plan.books} />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <p className="font-serif text-sm text-text">
              {formatTemplate(t.home.yearProgress, { finished: plan.finishedCount, total })}
            </p>
            <p className="shrink-0 font-mono text-xs text-muted">
              {formatTemplate(t.home.yearBreakdown, { reading: plan.readingCount, want: plan.wantCount })}
            </p>
          </div>
        </>
      )}
    </>
  );
}
