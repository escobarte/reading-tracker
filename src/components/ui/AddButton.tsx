import type { ButtonHTMLAttributes } from "react";
import { Icon } from "./Icon";

type AddButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function AddButton({ label, className = "", ...props }: AddButtonProps) {
  return (
    <button
      aria-label={label}
      className={`inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-on ${className}`}
      {...props}
    >
      <Icon name="plus" />
    </button>
  );
}
