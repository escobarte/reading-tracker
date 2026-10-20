"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StubBlock } from "@/components/layout/StubBlock";
import { useLocale } from "@/i18n/LocaleProvider";

export default function NotesPage() {
  const { t } = useLocale();

  return (
    <AppShell variant="narrow">
      <PageHeader title={t.notes.title} />
      <StubBlock />
    </AppShell>
  );
}
