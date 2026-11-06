"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Cover } from "@/components/ui/Cover";
import { Icon } from "@/components/ui/Icon";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import { formatHoursMinutesCompact, formatShortDate } from "@/lib/time";
import { clearFinishDraft, readFinishDraft, writeFinishDraft } from "@/lib/reading-finish-draft";
import type { ReadingWrapupStats } from "@/lib/db/sessions";
import { saveReadingWrapupAction } from "./actions";

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

type FinishScreenProps = {
  book: { id: string; title: string; author: string | null; coverUrl: string | null };
  reading: {
    id: string;
    startedAt: string | null;
    finishedAt: string;
    rating: number | null;
    review: string | null;
    takeaway: string | null;
  };
  stats: ReadingWrapupStats;
  today: { pages: number; goal: number };
};

export function FinishScreen({ book, reading, stats, today }: FinishScreenProps) {
  const { t, locale } = useLocale();
  const router = useRouter();

  const [hasExistingWrapup] = useState(
    () => reading.rating != null || Boolean(reading.review) || Boolean(reading.takeaway),
  );
  const [rating, setRating] = useState<number | null>(reading.rating);
  const [review, setReview] = useState(reading.review ?? "");
  const [takeaway, setTakeaway] = useState(reading.takeaway ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    function init() {
      const draft = readFinishDraft(reading.id);
      if (draft) {
        setRating(draft.rating);
        setReview(draft.review);
        setTakeaway(draft.takeaway);
      }
      setDraftReady(true);
    }
    init();
  }, [reading.id]);

  useEffect(() => {
    if (!draftReady) return;
    writeFinishDraft(reading.id, { rating, review, takeaway });
  }, [draftReady, reading.id, rating, review, takeaway]);

  function handleRatingKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : -1;
    setRating((prev) => Math.min(5, Math.max(1, (prev ?? 0) + delta)));
  }

  function handleSkip() {
    router.push(`/books/${book.id}`);
  }

  async function handleSave() {
    setSaving(true);
    setError(false);
    try {
      await saveReadingWrapupAction(book.id, reading.id, {
        rating,
        review: review || null,
        takeaway: takeaway || null,
      });
      clearFinishDraft(reading.id);
      router.push(`/books/${book.id}`);
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  const startLabel = reading.startedAt ? formatShortDate(reading.startedAt, locale) : "—";
  const endLabel = formatShortDate(reading.finishedAt, locale);
  const dateRangeLabel = formatTemplate(t.bookFinish.dateRange, { start: startLabel, end: endLabel });

  return (
    <AppShell today={today}>
      <div className="pb-10">
        <div className="flex items-center gap-3 py-5">
          <button
            type="button"
            onClick={handleSkip}
            aria-label={t.bookFinish.closeLabel}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
          >
            <Icon name="close" />
          </button>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">{t.bookFinish.eyebrow}</p>
            <h1 className="font-serif text-[28px] font-bold leading-[1.15] text-text lg:text-[34px]">
              {hasExistingWrapup ? t.bookFinish.headingEdit : t.bookFinish.headingNew}
            </h1>
          </div>
        </div>

        <div className="grid gap-4 lg:max-w-[1100px] lg:grid-cols-[5fr_7fr] lg:items-start lg:gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4">
              <Cover title={book.title} coverUrl={book.coverUrl ?? undefined} size="row" />
              <div className="min-w-0">
                <p className="truncate font-serif text-xl font-bold text-text">{book.title}</p>
                {book.author && <p className="truncate font-mono text-xs text-muted">{book.author}</p>}
                <p className="mt-1 font-mono text-xs text-accent">{dateRangeLabel}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-line bg-surface p-3.5 text-center">
                <p className="font-mono text-xl text-text">{stats.days}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                  {t.bookFinish.tileDays}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3.5 text-center">
                <p className="font-mono text-xl text-text">
                  {formatHoursMinutesCompact(stats.minutes)}{" "}
                  <span className="text-xs text-muted">{t.bookFinish.timeUnit}</span>
                </p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                  {t.bookFinish.tileTime}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3.5 text-center">
                <p className="font-mono text-xl text-text">{stats.pages}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                  {t.bookFinish.tilePages}
                </p>
              </div>
            </div>

            <div className="rounded-xl border-[1.5px] border-dashed border-stitch p-4">
              <p className="text-center font-serif text-lg font-bold text-text">{t.bookFinish.ratingTitle}</p>
              <div
                role="radiogroup"
                aria-label={t.bookFinish.ratingTitle}
                onKeyDown={handleRatingKeyDown}
                className="mt-3 flex justify-center"
              >
                {STAR_VALUES.map((n) => {
                  const filled = rating != null && n <= rating;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={formatTemplate(t.bookFinish.ratingStarLabel, { n })}
                      tabIndex={n === (rating ?? 1) ? 0 : -1}
                      onClick={() => setRating((prev) => (prev === n ? null : n))}
                      className="flex h-[52px] w-[52px] items-center justify-center"
                    >
                      <Icon
                        name="favorite"
                        width={36}
                        height={36}
                        className={filled ? "text-accent" : "text-stitch"}
                        style={filled ? { fill: "currentColor" } : { fill: "none", strokeDasharray: "3 3" }}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-center font-mono text-[13px] text-muted">
                {rating != null
                  ? formatTemplate(t.bookFinish.ratingSummarySet, { rating })
                  : t.bookFinish.ratingSummaryEmpty}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="finish-review" className="font-serif text-lg font-bold text-text">
                  {t.book.reviewLabel}
                </label>
                <span className="font-mono text-xs text-muted">{t.bookFinish.reviewHint}</span>
              </div>
              <textarea
                id="finish-review"
                value={review}
                onChange={(event) => setReview(event.target.value)}
                placeholder={t.bookFinish.reviewHint}
                rows={5}
                className="mt-2 min-h-[130px] w-full rounded-[14px] border-[1.5px] border-line bg-surface-2 p-4 font-serif text-lg text-text outline-none placeholder:italic placeholder:text-muted focus:border-accent"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="finish-takeaway" className="font-serif text-lg font-bold text-text">
                  {t.book.takeawayLabel}
                </label>
                <span className="font-mono text-xs text-muted">{t.bookFinish.takeawayHint}</span>
              </div>
              <textarea
                id="finish-takeaway"
                value={takeaway}
                onChange={(event) => setTakeaway(event.target.value)}
                placeholder={t.bookFinish.takeawayHint}
                rows={6}
                className="mt-2 min-h-[150px] w-full rounded-[14px] border-[1.5px] border-line bg-surface-2 p-4 font-serif text-lg text-text outline-none placeholder:italic placeholder:text-muted focus:border-accent"
              />
            </div>

            {error && <p className="font-serif text-sm text-deadline">{t.bookFinish.errorGeneric}</p>}

            <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-center lg:justify-end">
              <Button onClick={handleSave} disabled={saving} className="order-1 w-full lg:order-2 lg:w-auto lg:px-8">
                {saving ? t.bookFinish.savingPending : t.bookFinish.saveButton}
              </Button>
              <button
                type="button"
                onClick={handleSkip}
                disabled={saving}
                className="order-2 h-11 text-center font-serif text-base text-muted disabled:opacity-50 lg:order-1"
              >
                {t.bookFinish.laterButton}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
