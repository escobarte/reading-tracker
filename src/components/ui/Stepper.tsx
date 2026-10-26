"use client";

import { useEffect, useRef, useState } from "react";

type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  decrementLabel: string;
  incrementLabel: string;
  inputLabel?: string;
  quickSteps?: number[];
  min?: number;
  max?: number;
};

export function Stepper({
  value,
  onChange,
  decrementLabel,
  incrementLabel,
  inputLabel,
  quickSteps = [5, 10, 20],
  min = 0,
  max,
}: StepperProps) {
  const clamp = (next: number) => Math.max(min, max !== undefined ? Math.min(max, next) : next);

  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  function commit(raw: string) {
    const parsed = Number.parseInt(raw, 10);
    const next = Number.isFinite(parsed) ? clamp(parsed) : value;
    setText(String(next));
    if (next !== value) onChange(next);
  }

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
        <input
          type="text"
          inputMode="numeric"
          aria-label={inputLabel}
          value={text}
          onFocus={(event) => {
            focused.current = true;
            event.target.select();
          }}
          onChange={(event) => setText(event.target.value.replace(/[^\d]/g, ""))}
          onBlur={(event) => {
            focused.current = false;
            commit(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="flex h-22 flex-1 items-center justify-center rounded-xl border-2 border-accent bg-input text-center font-mono text-5xl text-text outline-none"
        />
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
