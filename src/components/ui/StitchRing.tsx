import type { ReactNode } from "react";

type StitchRingProps = {
  percent: number;
  size?: "sm" | "lg";
  children?: ReactNode;
};

const sizes = {
  sm: { box: 100, r: 40, stroke: 7, dash: "6 5" },
  lg: { box: 280, r: 126, stroke: 10, dash: "8 7" },
} as const;

export function StitchRing({ percent, size = "sm", children }: StitchRingProps) {
  const { box, r, stroke, dash } = sizes[size];
  const center = box / 2;
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: box, height: box }}
    >
      <svg
        viewBox={`0 0 ${box} ${box}`}
        width={box}
        height={box}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeOpacity={0.28}
          strokeWidth={stroke}
          strokeDasharray={dash}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${clamped} ${100 - clamped}`}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-text">
          {children}
        </div>
      )}
    </div>
  );
}
