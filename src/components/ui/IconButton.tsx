import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
};

export function IconButton({ icon, label, className = "", ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text ${className}`}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
