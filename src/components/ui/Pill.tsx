import type { ButtonHTMLAttributes, ReactNode } from "react";

type PillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  count?: number;
  children: ReactNode;
};

export function Pill({ active, count, className = "", children, ...props }: PillProps) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex h-11 items-center gap-2 rounded-pill px-4 font-serif text-sm transition-colors ${
        active
          ? "bg-accent font-bold text-accent-on"
          : "border border-line bg-surface text-text"
      } ${className}`}
      {...props}
    >
      <span>{children}</span>
      {typeof count === "number" && (
        <span className="font-mono text-xs opacity-80">{count}</span>
      )}
    </button>
  );
}
