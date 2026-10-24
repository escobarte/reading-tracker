import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";

type AppShellVariant = "default" | "narrow" | "focused" | "bare" | "sheet";

const containerByVariant: Record<Exclude<AppShellVariant, "bare" | "sheet">, string> = {
  default: "max-w-[480px] lg:max-w-[1200px]",
  narrow: "max-w-[480px] lg:max-w-[720px]",
  focused: "max-w-[480px]",
};

export function AppShell({
  children,
  variant = "default",
  footer,
}: {
  children?: ReactNode;
  variant?: AppShellVariant;
  /** "focused" only: заменяет BottomNav собственной нижней панелью (таймер сессии). */
  footer?: ReactNode;
}) {
  if (variant === "bare") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5 py-[max(20px,env(safe-area-inset-top))]">
        <div className="w-full lg:w-[440px]">{children}</div>
      </div>
    );
  }

  if (variant === "sheet") {
    return (
      <div className="mx-auto flex h-dvh max-w-[480px] flex-col lg:mx-0 lg:max-w-none lg:flex-row">
        <Sidebar />
        <div className="flex-1 overflow-y-auto overscroll-y-none">
          <main className="px-5 pb-10 pt-[max(20px,env(safe-area-inset-top))] lg:px-10 lg:pb-10 lg:pt-8">
            <div className="mx-auto max-w-[480px] lg:max-w-[1200px]">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  if (variant === "focused") {
    return (
      <div className="mx-auto flex h-dvh max-w-[480px] flex-col">
        <main className="flex-1 overflow-y-auto overscroll-y-none px-5 pb-6 pt-[max(20px,env(safe-area-inset-top))]">
          {children}
        </main>
        {footer && (
          <div className="shrink-0 border-t-2 border-dashed border-stitch bg-nav px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col lg:mx-0 lg:max-w-none lg:flex-row">
      <Sidebar />
      <div className="flex-1 overflow-y-auto overscroll-y-none">
        <main className="px-5 pt-[max(20px,env(safe-area-inset-top))] lg:px-10 lg:pb-10 lg:pt-8">
          <div className={`mx-auto ${containerByVariant[variant]}`}>{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
