import type { HTMLAttributes } from "react";

const rivetStyle = {
  background:
    "radial-gradient(circle at 35% 30%, var(--rivet-light), var(--rivet-dark) 70%)",
};

export function HeroCard({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow-hero)] lg:p-5 ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 55%)",
      }}
      {...props}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[5px] rounded-md border-[1.5px] border-dashed"
        style={{ borderColor: "color-mix(in srgb, var(--accent) 32%, transparent)" }}
      />
      {(["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"] as const).map(
        (position) => (
          <span
            key={position}
            aria-hidden="true"
            className={`absolute ${position} h-2 w-2 rounded-full`}
            style={rivetStyle}
          />
        ),
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
