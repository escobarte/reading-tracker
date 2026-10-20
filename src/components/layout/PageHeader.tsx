"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/i18n/LocaleProvider";

type PageHeaderProps = {
  title: string;
  action?: ReactNode;
};

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3 py-5">
      <div>
        <AppLabel />
        <h1 className="font-serif text-[28px] font-bold leading-[1.15] text-text lg:text-[34px]">
          {title}
        </h1>
      </div>
      {action && <div className="pt-6">{action}</div>}
    </header>
  );
}

function AppLabel() {
  const { t } = useLocale();
  return (
    <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
      {t.common.appName}
    </p>
  );
}
