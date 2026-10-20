"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StubBlock } from "@/components/layout/StubBlock";
import { useLocale } from "@/i18n/LocaleProvider";

export default function StatsPage() {
  const { t } = useLocale();

  return (
    <AppShell>
      <PageHeader title={t.stats.title} />
      <StubBlock />
    </AppShell>
  );
}
