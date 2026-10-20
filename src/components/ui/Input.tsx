import { useId, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  numeric?: boolean;
};

export function Input({ label, numeric, className = "", id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
        {label}
      </label>
      <input
        id={inputId}
        className={`h-13 rounded-md border-[1.5px] border-line bg-input px-4 text-lg text-text outline-none focus:border-2 focus:border-accent ${
          numeric ? "font-mono" : "font-serif"
        } ${className}`}
        {...props}
      />
    </div>
  );
}
