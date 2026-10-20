"use client";

import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { AddButton } from "@/components/ui/AddButton";
import { Pill } from "@/components/ui/Pill";
import { Chip } from "@/components/ui/Chip";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Input } from "@/components/ui/Input";
import { Stepper } from "@/components/ui/Stepper";
import { Card } from "@/components/ui/Card";
import { HeroCard } from "@/components/ui/HeroCard";
import { GoalCard } from "@/components/ui/GoalCard";
import { StitchBar } from "@/components/ui/StitchBar";
import { StitchRing } from "@/components/ui/StitchRing";
import { StatTile } from "@/components/ui/StatTile";
import { Cover } from "@/components/ui/Cover";
import { useLocale } from "@/i18n/LocaleProvider";
import { useTheme, type Theme } from "@/lib/theme";

const ICON_NAMES: IconName[] = [
  "home",
  "library",
  "start",
  "notes",
  "stats",
  "settings",
  "search",
  "plus",
  "close",
  "back",
  "chevron-down",
  "pause",
  "stop",
  "camera",
  "quote",
  "favorite",
  "check",
  "more",
  "drag",
  "export",
];

const SAMPLE_TITLES = ["Дюна", "1984", "Мастер и Маргарита", "Алхимик", "Стоик", "Три товарища"];

export function DevKit() {
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-dvh bg-bg p-5">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
            {t.common.appName}
          </p>
          <h1 className="font-serif text-[28px] font-bold text-text">{t.devkit.title}</h1>
          <p className="font-mono text-xs text-muted">{t.devkit.badge}</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <SegmentedControl
            aria-label={t.settings.language}
            value={locale}
            onChange={setLocale}
            options={[
              { value: "ru", label: t.settings.languageRu },
              { value: "en", label: t.settings.languageEn },
            ]}
          />
          <SegmentedControl
            aria-label={t.settings.theme}
            value={theme}
            onChange={setTheme}
            options={[
              { value: "light", label: t.settings.themeLight },
              { value: "dark", label: t.settings.themeDark },
            ]}
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <ThemePanel theme="light" />
        <ThemePanel theme="dark" />
      </div>
    </div>
  );
}

function ThemePanel({ theme }: { theme: Theme }) {
  const { t } = useLocale();
  const [segmented, setSegmented] = useState<"pages" | "percent">("pages");
  const [page, setPage] = useState(214);
  const [pill, setPill] = useState(true);
  const [title, setTitle] = useState("");

  return (
    <section data-theme={theme} className="theme-surface rounded-xl p-5">
      <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.14em] text-muted">
        {theme === "light" ? t.settings.themeLight : t.settings.themeDark}
      </h2>

      <Group title={t.devkit.sectionIcons}>
        <div className="grid grid-cols-5 gap-3">
          {ICON_NAMES.map((name) => (
            <div
              key={name}
              className="flex flex-col items-center gap-1 rounded-lg border border-line bg-surface p-2 text-text"
            >
              <Icon name={name} />
              <span className="font-mono text-[10px] text-muted">{name}</span>
            </div>
          ))}
        </div>
      </Group>

      <Group title={t.devkit.sectionButtons}>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">{t.devkit.buttonPrimary}</Button>
          <Button variant="secondary">{t.devkit.buttonSecondary}</Button>
          <Button variant="text">{t.devkit.buttonText}</Button>
          <IconButton icon="camera" label={t.devkit.buttonSecondary} />
          <AddButton label={t.devkit.buttonPrimary} />
        </div>
      </Group>

      <Group title={t.devkit.sectionPills}>
        <div className="flex flex-wrap items-center gap-3">
          <Pill active={pill} count={12} onClick={() => setPill(true)}>
            {t.devkit.pillActive}
          </Pill>
          <Pill active={!pill} count={4} onClick={() => setPill(false)}>
            {t.devkit.pillInactive}
          </Pill>
          <Chip>{t.devkit.chipDefault}</Chip>
          <Chip variant="ok">{t.devkit.chipOk}</Chip>
          <Chip variant="quote">{t.devkit.chipQuote}</Chip>
        </div>
      </Group>

      <Group title={t.devkit.sectionSegmented}>
        <SegmentedControl
          aria-label={t.devkit.sectionSegmented}
          value={segmented}
          onChange={setSegmented}
          options={[
            { value: "pages", label: "Стр." },
            { value: "percent", label: "%" },
          ]}
        />
      </Group>

      <Group title={t.devkit.sectionInput}>
        <Input
          label={t.devkit.inputLabel}
          placeholder={t.devkit.inputPlaceholder}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Group>

      <Group title={t.devkit.sectionStepper}>
        <Stepper
          value={page}
          onChange={setPage}
          decrementLabel="−1"
          incrementLabel="+1"
        />
      </Group>

      <Group title={t.devkit.sectionCards}>
        <div className="flex flex-col gap-4">
          <HeroCard>
            <p className="font-serif text-lg font-bold text-text">{t.devkit.cardHeroTitle}</p>
            <p className="font-serif text-sm text-muted">{t.devkit.cardHeroAuthor}</p>
          </HeroCard>
          <GoalCard>
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">
              {t.devkit.cardGoalTitle}
            </p>
            <p className="font-serif text-sm text-text">{t.devkit.cardGoalBody}</p>
          </GoalCard>
          <Card>
            <p className="font-serif text-sm text-text">Card</p>
          </Card>
        </div>
      </Group>

      <Group title={t.devkit.sectionStitch}>
        <div className="flex flex-col gap-4">
          <StitchBar percent={21} label="21%" />
          <div className="flex items-center gap-6">
            <StitchRing percent={60} size="sm">
              18
            </StitchRing>
            <StitchRing percent={35} size="lg">
              <span className="font-mono text-4xl">24:18</span>
            </StitchRing>
          </div>
        </div>
      </Group>

      <Group title={t.devkit.sectionStat}>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label={t.devkit.statLabelPages} value="214" />
          <StatTile label={t.devkit.statLabelStreak} value="12" highlight />
        </div>
      </Group>

      <Group title={t.devkit.sectionCover}>
        <div className="flex flex-wrap items-end gap-3">
          {SAMPLE_TITLES.map((sample) => (
            <Cover key={sample} title={sample} size="row" />
          ))}
        </div>
      </Group>
    </section>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-accent">{title}</h3>
      {children}
    </div>
  );
}
