import type { HeatmapCell } from "@/lib/db/stats";

type HeatmapProps = {
  weeks: HeatmapCell[][];
  weekdayLabels: string[];
  legendLessLabel: string;
  legendMoreLabel: string;
};

const LEVEL_BG: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "var(--heat-empty-bg)",
  1: "var(--heat-1)",
  2: "var(--heat-2)",
  3: "var(--heat-3)",
  4: "var(--heat-4)",
};

function cellStyle(cell: HeatmapCell): { background?: string; border?: string; boxShadow?: string } {
  if (!cell.inRange) return {};
  if (cell.isFuture) {
    return { background: "transparent", border: "1.5px dashed var(--heat-future-border)" };
  }
  const style: { background?: string; border?: string; boxShadow?: string } = {
    background: LEVEL_BG[cell.level],
    border: cell.level === 0 ? "1px solid var(--heat-empty-border)" : "1px solid transparent",
  };
  if (cell.isToday) {
    style.boxShadow = "0 0 0 2px var(--surface), 0 0 0 4px var(--text)";
  }
  return style;
}

/** Сетка 7 колонок (Пн–Вс), DESIGN.md раздел 6: клетка 38/44 (ПК), радиус 7, промежуток 4/6. Декоративно, итог дублируется текстом рядом. */
export function Heatmap({ weeks, weekdayLabels, legendLessLabel, legendMoreLabel }: HeatmapProps) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 lg:gap-1.5">
        {weekdayLabels.map((label) => (
          <span key={label} className="text-center font-serif text-[13px] text-muted">
            {label}
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="mt-1.5 grid grid-cols-7 gap-1 lg:gap-1.5">
        {weeks.flatMap((week, wi) =>
          week.map((cell, di) => (
            <div key={`${wi}-${di}`} className="h-[38px] rounded-[7px] lg:h-11" style={cellStyle(cell)} />
          )),
        )}
      </div>
      <div aria-hidden="true" className="mt-3 flex items-center justify-end gap-1.5 font-mono text-xs text-muted">
        <span>{legendLessLabel}</span>
        {([1, 2, 3, 4] as const).map((level) => (
          <span key={level} className="h-3 w-3 rounded-[3px]" style={{ background: LEVEL_BG[level] }} />
        ))}
        <span>{legendMoreLabel}</span>
      </div>
    </div>
  );
}
