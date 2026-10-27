type WeekBarDay = {
  dateKey: string;
  weekdayIndex: number;
  pages: number;
  isToday: boolean;
  isFuture: boolean;
  noRead: boolean;
};

type WeekBarsProps = {
  days: WeekBarDay[];
  goalPerDay: number;
  goalLabel: string;
  weekdayLabels: string[];
  futureValueLabel: string;
};

const CHART_HEIGHT = 96;

export function WeekBars({ days, goalPerDay, goalLabel, weekdayLabels, futureValueLabel }: WeekBarsProps) {
  const maxValue = Math.max(goalPerDay, ...days.map((d) => d.pages), 1);
  const goalBottom = Math.min(CHART_HEIGHT, Math.round((goalPerDay / maxValue) * CHART_HEIGHT));

  return (
    <div>
      <div className="flex items-end justify-between gap-1.5">
        {days.map((day) => (
          <span key={day.dateKey} className="flex-1 text-center font-mono text-xs text-muted">
            {day.isFuture ? futureValueLabel : day.pages}
          </span>
        ))}
      </div>

      <div className="relative mt-1.5 flex items-end justify-between gap-1.5" style={{ height: CHART_HEIGHT }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 border-t-[1.5px] border-dashed"
          style={{ bottom: goalBottom, borderColor: "color-mix(in srgb, var(--text) 40%, transparent)" }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-0 font-mono text-xs text-muted"
          style={{ bottom: Math.min(CHART_HEIGHT - 14, goalBottom + 4) }}
        >
          {goalLabel}
        </span>

        {days.map((day) => {
          if (day.isFuture || day.noRead) {
            return (
              <div key={day.dateKey} className="flex flex-1 items-end justify-center pb-1.5">
                <span aria-hidden="true" className="w-3 border-t-2 border-dashed border-stitch" />
              </div>
            );
          }
          const height = Math.max(4, Math.round((day.pages / maxValue) * CHART_HEIGHT));
          return (
            <div key={day.dateKey} className="flex flex-1 items-end justify-center">
              <div
                className={`w-6 rounded-t-[5px] rounded-b-[2px] ${
                  day.isToday ? "bg-accent shadow-[var(--shadow-cta)]" : "bg-bar"
                }`}
                style={{
                  height,
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent 0 6px, color-mix(in srgb, var(--bg) 50%, transparent) 6px 8px)",
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 flex justify-between gap-1.5">
        {days.map((day) => (
          <span
            key={day.dateKey}
            className={`flex-1 text-center font-serif text-[13px] ${
              day.isToday ? "font-bold text-accent" : "text-muted"
            }`}
          >
            {weekdayLabels[day.weekdayIndex]}
          </span>
        ))}
      </div>
    </div>
  );
}
