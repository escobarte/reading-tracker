import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col">
      <main className="flex-1 overflow-y-auto pt-[max(20px,env(safe-area-inset-top))] px-5">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
