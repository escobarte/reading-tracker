import type { HTMLAttributes } from "react";

export function GoalCard({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border-[1.5px] border-dashed border-deadline bg-surface p-4 lg:p-5 ${className}`}
      {...props}
    />
  );
}
