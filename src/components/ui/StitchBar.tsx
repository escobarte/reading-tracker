type StitchBarProps = {
  percent: number;
  label?: string;
};

const stitchPattern = (color: string) =>
  `repeating-linear-gradient(90deg, ${color} 0 7px, transparent 7px 11px)`;

export function StitchBar({ percent, label }: StitchBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-2.5 flex-1 overflow-hidden rounded-full"
        style={{ backgroundImage: stitchPattern("color-mix(in srgb, var(--accent) 28%, transparent)") }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${clamped}%`, backgroundImage: stitchPattern("var(--accent)") }}
        />
      </div>
      {label !== undefined && (
        <span className="font-mono text-sm text-muted">{label}</span>
      )}
    </div>
  );
}
