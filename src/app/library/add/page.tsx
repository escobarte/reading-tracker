"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { useLocale } from "@/i18n/LocaleProvider";
import { AddBookForm } from "./AddBookForm";

export default function AddBookPage() {
  const { t } = useLocale();

  return (
    <AppShell variant="sheet">
      <header className="flex items-center gap-4 py-5">
        <Link
          href="/library"
          aria-label={t.common.close}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text lg:hidden"
        >
          <Icon name="close" />
        </Link>
        <Link
          href="/library"
          aria-label={t.common.back}
          className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text lg:inline-flex"
        >
          <Icon name="back" />
        </Link>
        <h1 className="font-serif text-[28px] font-bold leading-[1.15] text-text lg:text-[34px]">
          {t.addbook.title}
        </h1>
      </header>

      <AddBookForm />
    </AppShell>
  );
}
