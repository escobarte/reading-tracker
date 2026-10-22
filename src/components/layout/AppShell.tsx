import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";

type AppShellVariant = "default" | "narrow" | "focused" | "bare";

const containerByVariant: Record<Exclude<AppShellVariant, "bare">, string> = {
  default: "mx-auto max-w-[480px] lg:max-w-[1200px]",
  narrow: "mx-auto max-w-[480px] lg:max-w-[720px]",
  focused: "mx-auto max-w-[480px]",
};

export function AppShell({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: AppShellVariant;
}) {
  if (variant === "bare") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5 py-[max(20px,env(safe-area-inset-top))]">
        <div className="w-full lg:w-[440px]">{children}</div>
      </div>
    );
  }

  if (variant === "focused") {
    return (
      <div className="mx-auto flex h-dvh max-w-[480px] flex-col">
        <main className="flex-1 overflow-y-auto overscroll-y-none px-5 pt-[max(20px,env(safe-area-inset-top))]">
          {children}
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col lg:mx-0 lg:max-w-none lg:flex-row">
      <Sidebar />
      <div className="flex-1 overflow-y-auto overscroll-y-none">
        <main
          className={`px-5 pt-[max(20px,env(safe-area-inset-top))] lg:px-10 lg:pb-10 lg:pt-8 ${containerByVariant[variant]}`}
        >
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
