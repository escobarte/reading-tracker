type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  decrementLabel: string;
  incrementLabel: string;
  quickSteps?: number[];
  min?: number;
  max?: number;
};

export function Stepper({
  value,
  onChange,
  decrementLabel,
  incrementLabel,
  quickSteps = [5, 10, 20],
  min = 0,
  max,
}: StepperProps) {
  const clamp = (next: number) => Math.max(min, max !== undefined ? Math.min(max, next) : next);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          aria-label={decrementLabel}
          onClick={() => onChange(clamp(value - 1))}
          className="h-22 w-16 rounded-lg border-[1.5px] border-dashed border-stitch font-mono text-2xl text-text"
        >
          −
        </button>
        <div className="flex h-22 flex-1 items-center justify-center rounded-xl border-2 border-accent bg-input">
          <span className="font-mono text-5xl text-text">{value}</span>
        </div>
        <button
          type="button"
          aria-label={incrementLabel}
          onClick={() => onChange(clamp(value + 1))}
          className="h-22 w-16 rounded-lg border-[1.5px] border-dashed border-stitch font-mono text-2xl text-text"
        >
          +
        </button>
      </div>
      <div className="flex gap-2">
        {quickSteps.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => onChange(clamp(value + step))}
            className="h-11 flex-1 rounded-lg border border-dashed border-stitch font-mono text-sm text-muted"
          >
            +{step}
          </button>
        ))}
      </div>
    </div>
  );
}
