type StatTileProps = {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
};

export function StatTile({ label, value, unit, highlight }: StatTileProps) {
  return (
    <div
      className={`rounded-xl bg-surface p-3.5 ${
        highlight ? "border-[1.5px] border-dashed border-accent" : "border border-line"
      }`}
    >
      <div className="font-mono text-xs text-muted">{label}</div>
      {unit ? (
        <div className="flex flex-wrap items-baseline gap-1">
          <span className="font-mono text-[34px] leading-tight text-text">{value}</span>
          <span className="font-mono text-xs text-muted">{unit}</span>
        </div>
      ) : (
        <div className="font-mono text-[34px] leading-tight text-text">{value}</div>
      )}
    </div>
  );
}
