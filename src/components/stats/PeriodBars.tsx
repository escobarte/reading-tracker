export type PeriodBar = {
  key: string;
  label: string;
  pages: number;
  isCurrent: boolean;
  isFuture: boolean;
};

type PeriodBarsProps = {
  bars: PeriodBar[];
  goal?: { value: number; label: string } | null;
  futureValueLabel: string;
};

/** Столбики для статистики (неделя/месяц/год/всё время) — та же визуальная логика, что у WeekBars, с шириной 36/44 и высотой 110/160 (ПК). */
export function PeriodBars({ bars, goal, futureValueLabel }: PeriodBarsProps) {
  const maxValue = Math.max(goal?.value ?? 0, ...bars.map((b) => b.pages), 1);
  const goalPercent = goal ? Math.min(100, (goal.value / maxValue) * 100) : null;

  return (
    <div>
      <div className="flex items-end justify-between gap-1.5">
        {bars.map((bar) => (
          <span key={bar.key} className="flex-1 text-center font-mono text-xs text-muted">
            {bar.isFuture ? futureValueLabel : bar.pages}
          </span>
        ))}
      </div>

      <div className="relative mt-1.5 h-[110px] lg:h-40">
        {goalPercent !== null && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 border-t-[1.5px] border-dashed"
              style={{ bottom: `${goalPercent}%`, borderColor: "color-mix(in srgb, var(--text) 40%, transparent)" }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-0 font-mono text-xs text-muted"
              style={{ bottom: `calc(${goalPercent}% + 4px)` }}
            >
              {goal?.label}
            </span>
          </>
        )}

        <div className="flex h-full items-end justify-between gap-1.5">
          {bars.map((bar) => {
            if (bar.isFuture || bar.pages === 0) {
              return (
                <div key={bar.key} className="flex flex-1 items-end justify-center pb-1.5">
                  <span aria-hidden="true" className="w-3 border-t-2 border-dashed border-stitch" />
                </div>
              );
            }
            const heightPercent = Math.min(100, Math.round((bar.pages / maxValue) * 100));
            return (
              <div key={bar.key} className="flex h-full flex-1 items-end justify-center">
                <div
                  className={`w-9 rounded-t-[5px] rounded-b-[2px] lg:w-11 ${
                    bar.isCurrent ? "bg-accent shadow-[var(--shadow-cta)]" : "bg-bar"
                  }`}
                  style={{
                    height: `max(6px, ${heightPercent}%)`,
                    backgroundImage:
                      "repeating-linear-gradient(0deg, transparent 0 6px, color-mix(in srgb, var(--bg) 50%, transparent) 6px 8px)",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-1.5 flex justify-between gap-1.5">
        {bars.map((bar) => (
          <span
            key={bar.key}
            className={`flex-1 text-center font-mono text-[11px] ${bar.isCurrent ? "font-bold text-accent" : "text-muted"}`}
          >
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}
