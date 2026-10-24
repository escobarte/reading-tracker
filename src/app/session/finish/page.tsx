"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Cover } from "@/components/ui/Cover";
import { Icon } from "@/components/ui/Icon";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StitchBar } from "@/components/ui/StitchBar";
import { Stepper } from "@/components/ui/Stepper";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import { DAILY_PAGES_GOAL } from "@/lib/config";
import { formatMinutesSeconds } from "@/lib/time";
import { clearActiveSession, elapsedSeconds, readActiveSession, type ActiveSession } from "@/lib/active-session";
import type { Book } from "@/lib/db/types";
import { getBookAction, getTodayProgressAction, saveSessionAction } from "../actions";

type Phase = "loading" | "not-found" | "ready";

export default function SessionFinishPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [mode, setMode] = useState<"pages" | "percent">("pages");
  const [pageValue, setPageValue] = useState(0);
  const [today, setToday] = useState<{ pages: number; sessionCount: number; streakDays: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function init() {
      await Promise.resolve();
      if (cancelled) return;

      const stored = readActiveSession();
      if (!stored) {
        setPhase("not-found");
        return;
      }
      setSession(stored);
      setPageValue(stored.startPage);

      const b = await getBookAction(stored.bookId);
      if (cancelled) return;
      if (!b) {
        setPhase("not-found");
        return;
      }
      setBook(b);
      setPhase("ready");
    }

    init();
    getTodayProgressAction().then((progress) => {
      if (!cancelled) setToday(progress);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase === "loading") {
    return <AppShell variant="focused" />;
  }

  if (phase === "not-found" || !session || !book) {
    return (
      <AppShell variant="focused">
        <PageHeader title={t.session.title} />
        <p className="py-6 text-center font-serif text-muted">{t.sessionFinish.notFound}</p>
        <Link
          href="/session"
          className="inline-flex h-12 w-full items-center justify-center rounded-xl border-[1.5px] border-dashed border-stitch bg-surface font-serif text-base text-text"
        >
          {t.sessionFinish.backToSession}
        </Link>
      </AppShell>
    );
  }

  const elapsed = elapsedSeconds(session, now);
  const totalPages = book.total_pages;
  const canPercent = book.format === "ebook" && Boolean(totalPages);

  const displayValue =
    mode === "percent" && totalPages ? Math.round((pageValue / totalPages) * 100) : pageValue;
  const minValue =
    mode === "percent" && totalPages ? Math.ceil((session.startPage / totalPages) * 100) : session.startPage;
  const maxValue = mode === "percent" ? 100 : (totalPages ?? undefined);

  function handleStepperChange(next: number) {
    if (mode === "percent" && totalPages) {
      setPageValue(Math.round((next / 100) * totalPages));
    } else {
      setPageValue(next);
    }
    setError(null);
  }

  const pagesRead = Math.max(0, pageValue - session.startPage);
  const percent = totalPages ? Math.round((pageValue / totalPages) * 100) : null;
  const speed = elapsed >= 60 && pagesRead > 0 ? Math.round((pagesRead / elapsed) * 3600) : null;
  const speedText = speed !== null ? String(speed) : t.sessionFinish.speedUnknown;
  const speedLine =
    percent !== null
      ? formatTemplate(t.sessionFinish.speedLine, { percent, speed: speedText })
      : formatTemplate(t.sessionFinish.speedLineNoPercent, { pages: pagesRead, speed: speedText });

  const previewPages = (today?.pages ?? 0) + pagesRead;
  const previewStreak = today ? (today.sessionCount > 0 ? today.streakDays : today.streakDays + 1) : 0;

  async function handleSave() {
    if (pageValue < session!.startPage || (totalPages && pageValue > totalPages)) {
      setError(formatTemplate(t.sessionFinish.pageError, { min: session!.startPage, max: totalPages ?? "∞" }));
      return;
    }
    if (elapsed < 10 && !window.confirm(t.sessionFinish.shortSessionConfirm)) return;

    setPending(true);
    try {
      await saveSessionAction({
        bookId: book!.id,
        reading_id: session!.readingId,
        started_at: session!.startedAt,
        ended_at: session!.pausedAt ?? new Date().toISOString(),
        page_from: session!.startPage,
        page_to: pageValue,
        seconds: elapsed,
        source: "timer",
      });
      clearActiveSession();
      router.push(`/books/${book!.id}`);
    } finally {
      setPending(false);
    }
  }

  function handleDelete() {
    if (!window.confirm(t.sessionFinish.deleteConfirm)) return;
    clearActiveSession();
    router.push(`/books/${book!.id}`);
  }

  return (
    <AppShell variant="focused">
      <div className="flex items-center gap-4 pb-6 pt-2">
        <Cover title={book.title} coverUrl={book.cover_url ?? undefined} size="session" />
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">
            {t.sessionFinish.finishedLabel}
          </p>
          <p className="font-serif text-[28px] font-bold leading-[1.15] text-text">
            {formatMinutesSeconds(elapsed, t.session.minuteUnit, t.session.secondUnit)}
          </p>
          <p className="truncate font-serif text-sm text-muted">{book.title}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
        <p className="font-serif text-lg font-bold text-text">{t.sessionFinish.stoppedAtPage}</p>

        {canPercent && (
          <SegmentedControl
            aria-label={t.sessionFinish.stoppedAtPage}
            value={mode}
            onChange={setMode}
            options={[
              { value: "pages", label: t.sessionFinish.segPages },
              { value: "percent", label: t.sessionFinish.segPercent },
            ]}
          />
        )}

        <Stepper
          value={displayValue}
          onChange={handleStepperChange}
          decrementLabel={t.session.pageDecrementLabel}
          incrementLabel={t.session.pageIncrementLabel}
          min={minValue}
          max={maxValue}
        />

        {error && <p className="font-serif text-sm text-deadline">{error}</p>}

        <div className="border-t border-dashed border-line pt-3">
          <p className="font-mono text-xs text-muted">
            {formatTemplate(t.sessionFinish.fromTo, { from: session.startPage, to: pageValue, pages: pagesRead })}
          </p>
          <p className="font-mono text-xs text-muted">{speedLine}</p>
        </div>
      </div>

      <Link
        href="/notes"
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-stitch bg-surface font-serif text-sm text-text"
      >
        <Icon name="plus" width={18} height={18} />
        {t.sessionFinish.addNoteLink}
      </Link>

      <div className="mt-6 flex items-center justify-between">
        <p className="flex items-center gap-1.5 font-mono text-sm text-ok">
          <Icon name="check" width={14} height={14} />
          {formatTemplate(t.sessionFinish.todaySummary, { read: previewPages, goal: DAILY_PAGES_GOAL })}
        </p>
        <p className="font-mono text-sm text-muted">
          {formatTemplate(t.sessionFinish.streakLabel, { days: previewStreak })}
        </p>
      </div>
      <div className="mt-2">
        <StitchBar percent={(previewPages / DAILY_PAGES_GOAL) * 100} />
      </div>

      <Button onClick={handleSave} disabled={pending} className="mt-6 h-14 w-full gap-2 text-lg">
        <Icon name="check" width={18} height={18} />
        {pending ? t.sessionFinish.savingPending : t.sessionFinish.save}
      </Button>
      <button
        type="button"
        onClick={handleDelete}
        className="mt-3 h-11 w-full text-center font-serif text-sm text-muted underline-offset-4 hover:underline"
      >
        {t.sessionFinish.delete}
      </button>
    </AppShell>
  );
}
