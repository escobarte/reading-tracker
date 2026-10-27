"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import { formatCount, pluralWord } from "@/i18n/plural";
import { computeDeadlineNorm, daysModeFromDueDate, dueDateFromDaysMode } from "@/lib/goals";
import { formatDeadlineWithWeekday, localDateKey } from "@/lib/time";
import { removeDeadlineAction, saveDeadlineAction } from "@/app/books/[id]/actions";

const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
/** Нет указания в DESIGN.md для значения по умолчанию у нового дедлайна — взято число из макета `deadline.png`. */
const DEFAULT_NEW_DAYS = 28;
const QUICK_STEPS = [7, 14, 30];

export type DeadlineDialogInitial = { dueDateKey: string; skipWeekdays: number[] };

type DeadlineDialogProps = {
  open: boolean;
  onClose: () => void;
  bookId: string;
  readingId: string;
  bookTitle: string;
  totalPages: number;
  currentPage: number;
  initial: DeadlineDialogInitial | null;
};

export function DeadlineDialog({
  open,
  onClose,
  bookId,
  readingId,
  bookTitle,
  totalPages,
  currentPage,
  initial,
}: DeadlineDialogProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [mode, setMode] = useState<"days" | "date">("days");
  const [dueDateKey, setDueDateKeyState] = useState("");
  const [readingWeekdays, setReadingWeekdays] = useState<number[]>(ALL_WEEKDAYS);
  const [daysText, setDaysText] = useState("");
  const daysFocused = useRef(false);

  // Сброс полей формы при каждом открытии диалога — на свежем рендере, а не в
  // эффекте (react-hooks/set-state-in-effect: иначе каскадный лишний рендер).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const todayKey = localDateKey(new Date());
      setMode("days");
      setDueDateKeyState(initial?.dueDateKey ?? dueDateFromDaysMode(todayKey, DEFAULT_NEW_DAYS));
      setReadingWeekdays(initial ? ALL_WEEKDAYS.filter((day) => !initial.skipWeekdays.includes(day)) : ALL_WEEKDAYS);
    }
  }

  const todayKey = localDateKey(new Date());
  const daysValue = dueDateKey ? Math.max(1, daysModeFromDueDate(todayKey, dueDateKey)) : DEFAULT_NEW_DAYS;

  useEffect(() => {
    if (!daysFocused.current) setDaysText(String(daysValue));
  }, [daysValue]);

  if (!open) return null;

  function setDaysValue(next: number) {
    setDueDateKeyState(dueDateFromDaysMode(todayKey, Math.max(1, next)));
  }

  function toggleWeekday(day: number) {
    setReadingWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  const skipWeekdays = ALL_WEEKDAYS.filter((day) => !readingWeekdays.includes(day));
  const remainingPages = Math.max(0, totalPages - currentPage);
  const computation = computeDeadlineNorm({
    todayKey,
    dueDateKey,
    skipWeekdays,
    remainingPages,
    pagesReadToday: 0,
  });

  function handleSave() {
    if (computation.status === "expired" || pending) return;
    startTransition(async () => {
      await saveDeadlineAction(bookId, readingId, dueDateKey, skipWeekdays);
      onClose();
      router.refresh();
    });
  }

  function handleRemove() {
    if (pending) return;
    startTransition(async () => {
      await removeDeadlineAction(bookId, readingId);
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="deadline-dialog-title"
      variant="sheet"
      header={
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.deadlineDialog.editTitle}</p>
            <h2 id="deadline-dialog-title" className="mt-1 font-serif text-2xl font-bold text-text">
              {bookTitle}
            </h2>
            <p className="mt-1 font-mono text-xs text-muted">
              {formatTemplate(t.deadlineDialog.progressCaption, {
                current: currentPage,
                total: totalPages,
                pagesUnit: t.book.pagesUnit,
                remaining: remainingPages,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.deadlineDialog.close}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch text-text"
          >
            <Icon name="close" />
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-muted">{t.deadlineDialog.methodLabel}</p>
          <SegmentedControl
            aria-label={t.deadlineDialog.methodLabel}
            value={mode}
            onChange={setMode}
            options={[
              { value: "days", label: t.deadlineDialog.modeDays },
              { value: "date", label: t.deadlineDialog.modeDate },
            ]}
          />
        </div>

        {mode === "days" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                aria-label={t.deadlineDialog.decrementLabel}
                onClick={() => setDaysValue(daysValue - 1)}
                className="h-16 w-14 shrink-0 rounded-lg border-[1.5px] border-dashed border-stitch font-mono text-xl text-text"
              >
                −
              </button>
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label={t.deadlineDialog.modeDays}
                  value={daysText}
                  onFocus={(event) => {
                    daysFocused.current = true;
                    event.target.select();
                  }}
                  onChange={(event) => setDaysText(event.target.value.replace(/[^\d]/g, ""))}
                  onBlur={(event) => {
                    daysFocused.current = false;
                    const parsed = Number.parseInt(event.target.value, 10);
                    setDaysValue(Number.isFinite(parsed) ? parsed : daysValue);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  className="h-16 w-full rounded-xl border-2 border-accent bg-input text-center font-mono text-4xl text-text outline-none"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-2 right-3 font-mono text-xs text-muted"
                >
                  {t.deadlineDialog.daysUnit}
                </span>
              </div>
              <button
                type="button"
                aria-label={t.deadlineDialog.incrementLabel}
                onClick={() => setDaysValue(daysValue + 1)}
                className="h-16 w-14 shrink-0 rounded-lg border-[1.5px] border-dashed border-stitch font-mono text-xl text-text"
              >
                +
              </button>
            </div>
            <div className="flex gap-2">
              {QUICK_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setDaysValue(daysValue + step)}
                  className="h-10 flex-1 rounded-lg border border-dashed border-stitch font-mono text-sm text-muted"
                >
                  +{step}
                </button>
              ))}
            </div>
            <p className="font-mono text-[13px] text-muted">
              {formatTemplate(t.book.deadlineUntil, { date: formatDeadlineWithWeekday(dueDateKey, locale) })}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Input
              label={t.deadlineDialog.dateInputLabel}
              type="date"
              numeric
              min={todayKey}
              value={dueDateKey}
              onChange={(event) => {
                if (event.target.value) setDueDateKeyState(event.target.value);
              }}
            />
            <p className="font-mono text-[13px] text-muted">{formatCount(daysValue, "day", locale)}</p>
          </div>
        )}

        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-muted">{t.deadlineDialog.weekdaysLabel}</p>
          <div className="grid grid-cols-7 gap-1.5">
            {ALL_WEEKDAYS.map((day, index) => {
              const active = readingWeekdays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleWeekday(day)}
                  className={`h-12 rounded-lg font-serif text-sm ${
                    active
                      ? "bg-accent font-bold text-accent-on"
                      : "border border-dashed border-muted text-muted"
                  }`}
                >
                  {t.home.weekdays[index]}
                </button>
              );
            })}
          </div>
          <p className="mt-2 font-serif text-sm text-muted">{t.deadlineDialog.weekdaysHint}</p>
        </div>

        <div className="rounded-xl border-[1.5px] border-dashed border-deadline bg-surface p-4">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-deadline">{t.deadlineDialog.normLabel}</p>
          {computation.status === "expired" ? (
            <p className="mt-2 font-serif text-lg text-deadline">{t.deadlineDialog.chooseLater}</p>
          ) : (
            <>
              <p className="mt-1 font-mono text-[40px] leading-none text-text">
                {computation.normPerDay} <span className="text-base text-muted">{t.deadlineDialog.normUnit}</span>
              </p>
              <p className="mt-2 font-mono text-xs text-muted">
                {formatTemplate(t.deadlineDialog.normSummary, {
                  remaining: computation.remainingPages,
                  pagesUnit: t.book.pagesUnit,
                  readable: computation.readableDaysFromToday,
                  daysWord: pluralWord(computation.readableDaysFromToday, "day", locale),
                  total: computation.totalDaysInPeriod,
                })}
              </p>
              {computation.tomorrowWarningNorm != null && (
                <p className="mt-2 font-serif text-[15px] italic text-muted">
                  {formatTemplate(t.book.deadlineWarning, {
                    pages: computation.tomorrowWarningNorm,
                    pagesUnit: t.book.pagesUnit,
                  })}
                </p>
              )}
            </>
          )}
        </div>

        <Button onClick={handleSave} disabled={pending || computation.status === "expired"} className="h-14 w-full">
          {pending ? t.deadlineDialog.savingPending : t.deadlineDialog.save}
        </Button>
        {initial && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            className="h-11 w-full text-center font-serif text-base text-accent disabled:opacity-50"
          >
            {t.deadlineDialog.remove}
          </button>
        )}
      </div>
    </Modal>
  );
}
