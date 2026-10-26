"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Cover } from "@/components/ui/Cover";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Stepper } from "@/components/ui/Stepper";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import { localDateKey, localDateTimeToUtc, localTimeKey } from "@/lib/time";
import type { Book, ReadingSession } from "@/lib/db/types";
import { deleteSessionAction, revertReadingAction, updateSessionAction } from "./actions";

export function SessionEditForm({ session, book }: { session: ReadingSession; book: Book }) {
  const { t } = useLocale();
  const router = useRouter();

  const endedAtInitial = session.ended_at ? new Date(session.ended_at) : new Date(session.started_at);
  const initialMinutes = session.seconds ? Math.round(session.seconds / 60) : 0;

  const [date, setDate] = useState(() => localDateKey(endedAtInitial));
  const [endTime, setEndTime] = useState(() => localTimeKey(endedAtInitial));
  const [minutes, setMinutes] = useState(initialMinutes > 0 ? String(initialMinutes) : "");
  const [pageFrom, setPageFrom] = useState(session.page_from ?? 0);
  const [mode, setMode] = useState<"pages" | "percent">("pages");
  const [pageTo, setPageTo] = useState(session.page_to ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const totalPages = book.total_pages;
  const canPercent = book.format === "ebook" && Boolean(totalPages);

  const displayPageFrom = mode === "percent" && totalPages ? Math.round((pageFrom / totalPages) * 100) : pageFrom;
  const displayPageTo = mode === "percent" && totalPages ? Math.round((pageTo / totalPages) * 100) : pageTo;

  function toPages(value: number): number {
    return mode === "percent" && totalPages ? Math.round((value / 100) * totalPages) : value;
  }

  async function afterMutation(result: { closedReading: boolean; needsRevertConfirm: boolean }) {
    if (result.needsRevertConfirm && window.confirm(t.sessionEdit.revertConfirm)) {
      await revertReadingAction(session.reading_id, book.id);
    }
    router.push(result.closedReading ? `/books/${book.id}?finished=1` : `/books/${book.id}`);
  }

  async function handleSave() {
    const minutesNum = Number(minutes);
    if (!minutesNum || minutesNum <= 0) {
      setError(t.sessionManual.minutesError);
      return;
    }
    if (pageTo < pageFrom || (totalPages && pageTo > totalPages)) {
      setError(formatTemplate(t.sessionManual.pageError, { min: pageFrom, max: totalPages ?? "∞" }));
      return;
    }

    setPending(true);
    try {
      const endedAt = localDateTimeToUtc(date, endTime);
      const startedAt = new Date(endedAt.getTime() - minutesNum * 60000);

      const result = await updateSessionAction(session.id, book.id, {
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        page_from: pageFrom,
        page_to: pageTo,
        seconds: minutesNum * 60,
      });
      await afterMutation(result);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t.sessionFinish.deleteConfirm)) return;
    setPending(true);
    try {
      const result = await deleteSessionAction(session.id, book.id, session.reading_id);
      await afterMutation(result);
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell variant="focused">
      <button
        type="button"
        aria-label={t.common.back}
        onClick={() => router.back()}
        className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
      >
        <Icon name="back" />
      </button>

      <div className="flex items-center gap-4 pb-6 pt-2">
        <Cover title={book.title} coverUrl={book.cover_url ?? undefined} size="session" />
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.sessionEdit.title}</p>
          <p className="truncate font-serif text-xl font-bold text-text">{book.title}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              label={t.sessionManual.dateLabel}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              max={localDateKey(new Date())}
            />
          </div>
          <div className="flex-1">
            <Input
              label={t.sessionManual.endTimeLabel}
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </div>
        </div>

        <Input
          label={t.sessionManual.minutesLabel}
          numeric
          inputMode="numeric"
          value={minutes}
          onChange={(event) => setMinutes(event.target.value.replace(/[^\d]/g, ""))}
        />

        <Input
          label={t.sessionManual.pageFromLabel}
          numeric
          inputMode="numeric"
          value={String(pageFrom)}
          onChange={(event) => {
            const next = Number(event.target.value.replace(/[^\d]/g, "") || "0");
            setPageFrom(next);
            if (pageTo < next) setPageTo(next);
            setError(null);
          }}
        />

        <div>
          <p className="mb-1.5 font-mono text-xs uppercase tracking-[0.1em] text-muted">
            {t.sessionManual.pageToLabel}
          </p>
          {canPercent && (
            <div className="mb-3">
              <SegmentedControl
                aria-label={t.sessionManual.pageToLabel}
                value={mode}
                onChange={setMode}
                options={[
                  { value: "pages", label: t.sessionFinish.segPages },
                  { value: "percent", label: t.sessionFinish.segPercent },
                ]}
              />
            </div>
          )}
          <Stepper
            value={displayPageTo}
            onChange={(next) => {
              setPageTo(toPages(next));
              setError(null);
            }}
            decrementLabel={t.session.pageDecrementLabel}
            incrementLabel={t.session.pageIncrementLabel}
            inputLabel={t.sessionManual.pageToLabel}
            min={displayPageFrom}
            max={mode === "percent" ? 100 : (totalPages ?? undefined)}
          />
        </div>

        {error && <p className="font-serif text-sm text-deadline">{error}</p>}
      </div>

      <Button onClick={handleSave} disabled={pending} className="mt-6 h-14 w-full text-lg">
        {pending ? t.sessionEdit.savingPending : t.sessionEdit.save}
      </Button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="mt-3 h-11 w-full text-center font-serif text-sm text-muted underline-offset-4 hover:underline disabled:opacity-50"
      >
        {t.sessionFinish.delete}
      </button>
    </AppShell>
  );
}
