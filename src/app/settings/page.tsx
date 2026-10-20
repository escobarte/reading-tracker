"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useLocale } from "@/i18n/LocaleProvider";
import { useTheme } from "@/lib/theme";

export default function SettingsPage() {
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();

  return (
    <AppShell>
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

      <section className="flex flex-col gap-2 py-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
          {t.settings.language}
        </h2>
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

      <section className="flex flex-col gap-2 py-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
          {t.settings.theme}
        </h2>
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
    </AppShell>
  );
}
