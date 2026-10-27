type YearSpinesProps = {
  filledCount: number;
  total?: number;
};

const SPINE_COLORS = ["var(--spine-1)", "var(--spine-2)", "var(--spine-3)", "var(--spine-4)"];

/** Deterministic mixed heights (46–64) so the row doesn't look mechanically uniform. */
const SPINE_HEIGHTS = [
  52, 46, 60, 54, 64, 48, 58, 50, 62, 46, 56, 60, 48, 64, 52, 58, 46, 54, 62, 50, 60, 48, 56, 64,
];

export function YearSpines({ filledCount, total = 24 }: YearSpinesProps) {
  const filled = Math.min(filledCount, total);

  return (
    <div className="flex items-end gap-[3px] overflow-hidden" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => {
        const height = SPINE_HEIGHTS[index % SPINE_HEIGHTS.length];
        const isFilled = index < filled;
        return (
          <span
            key={index}
            className={`w-[10px] shrink-0 rounded-t-[2px] ${isFilled ? "" : "border-[1.5px] border-dashed border-stitch"}`}
            style={{ height, background: isFilled ? SPINE_COLORS[index % SPINE_COLORS.length] : undefined }}
          />
        );
      })}
    </div>
  );
}
