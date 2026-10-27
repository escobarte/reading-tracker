"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { GoalCard } from "@/components/ui/GoalCard";
import { Icon } from "@/components/ui/Icon";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import { useTheme } from "@/lib/theme";
import { logout, setDailyPagesGoalAction, setYearlyBooksGoalAction } from "./actions";

const DAILY_RANGE = { min: 1, max: 500 };
const YEAR_RANGE = { min: 1, max: 200 };
const SAVE_DELAY_MS = 600;

type SettingsViewProps = {
  dailyGoal: number;
  yearGoal: number;
  finishedThisYear: number;
  email: string | null;
  provider: "google" | "email" | null;
  today: { pages: number; goal: number };
};

/** Клон значения с debounce-сохранением на сервере ~600 мс после последнего изменения. */
function useDebouncedGoal(
  initial: number,
  range: { min: number; max: number },
  save: (value: number) => Promise<number>,
): [number, (next: number) => void] {
  const [value, setValue] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function change(next: number) {
    const clamped = Math.min(range.max, Math.max(range.min, next));
    setValue(clamped);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      save(clamped);
    }, SAVE_DELAY_MS);
  }

  return [value, change];
}

export function SettingsView({ dailyGoal, yearGoal, finishedThisYear, email, provider, today }: SettingsViewProps) {
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();

  const [dailyPages, setDailyPages] = useDebouncedGoal(dailyGoal, DAILY_RANGE, setDailyPagesGoalAction);
  const [yearBooks, setYearBooks] = useDebouncedGoal(yearGoal, YEAR_RANGE, setYearlyBooksGoalAction);

  return (
    <AppShell variant="narrow" today={today}>
      <PageHeader
        title={t.settings.title}
        action={
          <Link
            href="/"
            aria-label={t.settings.back}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
          >
            <Icon name="back" />
          </Link>
        }
      />

      <div className="flex flex-col gap-4 pb-10 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="flex flex-col gap-4">
          <section className="rounded-xl border border-line bg-surface p-4">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.settings.language}</h2>
            <SegmentedControl
              aria-label={t.settings.language}
              value={locale}
              onChange={setLocale}
              options={[
                { value: "ru", label: t.settings.languageRu },
                { value: "en", label: t.settings.languageEn },
              ]}
            />
          </section>

          <section className="rounded-xl border border-line bg-surface p-4">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.settings.theme}</h2>
            <SegmentedControl
              aria-label={t.settings.theme}
              value={theme}
              onChange={setTheme}
              options={[
                { value: "light", label: t.settings.themeLight },
                { value: "dark", label: t.settings.themeDark },
              ]}
            />
          </section>

          <section className="rounded-xl border border-line bg-surface p-4 opacity-60">
            <div className="flex items-center justify-between gap-3">
              <p className="font-serif text-lg font-bold text-text">{t.settings.reminderTitle}</p>
              <span className="rounded-md border border-dashed border-stitch px-2.5 py-1 font-mono text-xs text-muted">
                {t.settings.reminderSoon}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled
                aria-label={t.settings.reminderToggleLabel}
                className="h-7 w-12 shrink-0 rounded-full border border-line bg-surface-2 p-0.5"
              >
                <span className="block h-5 w-5 rounded-full bg-muted" />
              </button>
              <span className="rounded-md border border-line bg-input px-4 py-2 font-mono text-lg text-muted">
                21:00
              </span>
            </div>
          </section>
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:mt-0">
          <GoalCard>
            <p className="mb-1 font-mono text-xs uppercase tracking-[0.1em] text-deadline">{t.settings.goalsTitle}</p>

            <GoalRow
              label={t.settings.dailyPagesLabel}
              caption={formatTemplate(t.settings.dailyPagesCaption, {
                pages: dailyPages * 7,
                pagesUnit: t.book.pagesUnit,
              })}
              value={dailyPages}
              onChange={setDailyPages}
              min={DAILY_RANGE.min}
              max={DAILY_RANGE.max}
              decrementLabel={t.settings.dailyPagesDecrement}
              incrementLabel={t.settings.dailyPagesIncrement}
            />

            <div className="my-3 border-t border-dashed border-line" />

            <GoalRow
              label={t.settings.yearBooksLabel}
              caption={formatTemplate(t.settings.yearBooksCaption, { count: finishedThisYear })}
              value={yearBooks}
              onChange={setYearBooks}
              min={YEAR_RANGE.min}
              max={YEAR_RANGE.max}
              decrementLabel={t.settings.yearBooksDecrement}
              incrementLabel={t.settings.yearBooksIncrement}
            />

            <p className="mt-3 font-serif text-sm text-muted">{t.settings.goalsHint}</p>
          </GoalCard>

          <section className="rounded-xl border border-line bg-surface p-4">
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.settings.accountTitle}</p>
            {email && <p className="font-mono text-sm text-text">{email}</p>}
            <p className="mt-0.5 font-mono text-sm text-muted">
              {provider === "google" ? t.settings.accountGoogle : t.settings.accountPassword}
            </p>
            <form action={logout} className="mt-3">
              <Button type="submit" variant="secondary" className="w-full">
                {t.settings.logout}
              </Button>
            </form>
          </section>
        </div>
      </div>

      <p className="pb-6 text-center font-mono text-xs text-muted lg:hidden">{t.common.appName}</p>
    </AppShell>
  );
}

type GoalRowProps = {
  label: string;
  caption: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  decrementLabel: string;
  incrementLabel: string;
};

function GoalRow({ label, caption, value, onChange, min, max, decrementLabel, incrementLabel }: GoalRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <p className="font-serif text-lg font-bold text-text">{label}</p>
        <p className="font-mono text-xs text-muted">{caption}</p>
      </div>
      <div className="flex shrink-0 items-stretch gap-1.5">
        <button
          type="button"
          aria-label={decrementLabel}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="h-14 w-11 rounded-lg border-[1.5px] border-dashed border-stitch font-mono text-lg text-text"
        >
          −
        </button>
        <div className="flex h-14 w-18 items-center justify-center rounded-lg border-2 border-accent bg-input font-mono text-2xl text-text">
          {value}
        </div>
        <button
          type="button"
          aria-label={incrementLabel}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="h-14 w-11 rounded-lg border-[1.5px] border-dashed border-stitch font-mono text-lg text-text"
        >
          +
        </button>
      </div>
    </div>
  );
}
