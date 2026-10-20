type Option<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ...props
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={props["aria-label"]}
      className="inline-flex h-12 items-center gap-1 rounded-lg border-[1.5px] border-line bg-surface-2 p-[3px]"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`h-full min-w-11 rounded-[10px] px-4 font-serif text-sm transition-colors ${
              active ? "bg-accent font-bold text-accent-on" : "text-muted"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
