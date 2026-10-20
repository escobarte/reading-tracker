"use client";

import { useLocale } from "@/i18n/LocaleProvider";

export function StubBlock() {
  const { t } = useLocale();

  return (
    <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stitch bg-surface p-8 text-center">
      <p className="font-serif text-lg font-bold text-text">{t.common.soon}</p>
      <p className="font-serif text-sm text-muted">{t.common.soonBody}</p>
    </div>
  );
}
