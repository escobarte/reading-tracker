type StatTileProps = {
  label: string;
  value: string;
  highlight?: boolean;
};

export function StatTile({ label, value, highlight }: StatTileProps) {
  return (
    <div
      className={`rounded-xl bg-surface p-3.5 ${
        highlight ? "border-[1.5px] border-dashed border-accent" : "border border-line"
      }`}
    >
      <div className="font-mono text-xs text-muted">{label}</div>
      <div className="font-mono text-[34px] leading-tight text-text">{value}</div>
    </div>
  );
}
