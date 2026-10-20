import type { HTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon";

type ChipVariant = "default" | "ok" | "quote";

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: ChipVariant;
  children: ReactNode;
};

const variants: Record<ChipVariant, string> = {
  default: "border border-dashed border-stitch text-muted",
  ok: "border border-ok text-ok",
  quote: "bg-accent text-accent-on border-transparent",
};

export function Chip({ variant = "default", className = "", children, ...props }: ChipProps) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-md px-2.5 font-mono text-xs ${variants[variant]} ${className}`}
      {...props}
    >
      {variant === "ok" && <Icon name="check" width={12} height={12} />}
      {children}
    </span>
  );
}
