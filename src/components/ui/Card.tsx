import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface p-4 lg:p-5 ${className}`}
      {...props}
    />
  );
}
