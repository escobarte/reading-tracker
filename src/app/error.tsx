"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleProvider";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="font-serif text-2xl font-bold text-text">{t.errorBoundary.title}</h1>
      <p className="max-w-[360px] font-serif text-base text-muted">{t.errorBoundary.message}</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => router.back()}>
          {t.errorBoundary.back}
        </Button>
        <Button onClick={reset}>{t.errorBoundary.retry}</Button>
      </div>
    </div>
  );
}
