"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleProvider";

export default function BookPageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <AppShell variant="bare">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="font-serif text-2xl font-bold text-text">{t.errorBoundary.title}</h1>
        <p className="font-serif text-base text-muted">{t.errorBoundary.message}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push("/library")}>
            {t.errorBoundary.back}
          </Button>
          <Button onClick={reset}>{t.errorBoundary.retry}</Button>
        </div>
      </div>
    </AppShell>
  );
}
