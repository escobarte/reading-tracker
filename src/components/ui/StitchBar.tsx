type StitchBarProps = {
  percent: number;
  label?: string;
  /** "accent" (по умолчанию, везде в приложении) или "muted" для второстепенных строк (жанры-не-победители). */
  tone?: "accent" | "muted";
};

const stitchPattern = (color: string) =>
  `repeating-linear-gradient(90deg, ${color} 0 7px, transparent 7px 11px)`;

const TONE_FILL: Record<NonNullable<StitchBarProps["tone"]>, string> = {
  accent: "var(--accent)",
  muted: "var(--stitch)",
};
const TONE_TRACK: Record<NonNullable<StitchBarProps["tone"]>, string> = {
  accent: "color-mix(in srgb, var(--accent) 28%, transparent)",
  muted: "color-mix(in srgb, var(--stitch) 28%, transparent)",
};

export function StitchBar({ percent, label, tone = "accent" }: StitchBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-2.5 flex-1 overflow-hidden rounded-full"
        style={{ backgroundImage: stitchPattern(TONE_TRACK[tone]) }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${clamped}%`, backgroundImage: stitchPattern(TONE_FILL[tone]) }}
        />
      </div>
      {label !== undefined && (
        <span className="font-mono text-sm text-muted">{label}</span>
      )}
    </div>
  );
}
