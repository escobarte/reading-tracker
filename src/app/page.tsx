"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StubBlock } from "@/components/layout/StubBlock";
import { Icon } from "@/components/ui/Icon";
import { useLocale } from "@/i18n/LocaleProvider";

export default function HomePage() {
  const { t } = useLocale();

  return (
    <AppShell>
      <PageHeader
        title={t.home.title}
        action={
          <Link
            href="/settings"
            aria-label={t.home.settings}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text lg:hidden"
          >
            <Icon name="settings" />
          </Link>
        }
      />
      <StubBlock />
    </AppShell>
  );
}
