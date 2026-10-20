import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "text";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 font-serif font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none min-h-11";

const variants: Record<ButtonVariant, string> = {
  primary:
    "h-14 rounded-xl bg-accent text-accent-on text-lg px-6 shadow-[var(--shadow-cta)]",
  secondary:
    "h-13 rounded-xl border-[1.5px] border-dashed border-stitch bg-surface text-text text-base px-6",
  text: "h-11 px-2 text-text text-base font-normal underline-offset-4 hover:underline",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
