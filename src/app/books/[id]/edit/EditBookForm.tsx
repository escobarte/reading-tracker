"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { BookForm, type BookFormValues } from "@/components/ui/BookForm";
import { Icon } from "@/components/ui/Icon";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Book } from "@/lib/db/types";
import { updateBookAction } from "./actions";

export function EditBookForm({ book }: { book: Book }) {
  const { t } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const initial: BookFormValues = {
    title: book.title,
    author: book.author ?? "",
    total_pages: book.total_pages,
    format: book.format,
    shelf: book.shelf,
    genre: book.genre ?? "",
    series: book.series ?? "",
    series_number: book.series_number,
    tags: book.tags,
  };

  function handleSubmit(values: BookFormValues) {
    startTransition(async () => {
      await updateBookAction(book.id, {
        title: values.title,
        author: values.author || null,
        total_pages: values.total_pages,
        format: values.format,
        genre: values.genre || null,
        series: values.series || null,
        series_number: values.series_number,
        tags: values.tags,
      });
      router.push(`/books/${book.id}`);
    });
  }

  return (
    <AppShell variant="sheet">
      <header className="flex items-center gap-4 py-5">
        <Link
          href={`/books/${book.id}`}
          aria-label={t.common.back}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
        >
          <Icon name="back" />
        </Link>
        <h1 className="font-serif text-[28px] font-bold leading-[1.15] text-text lg:text-[34px]">
          {t.addbook.editTitle}
        </h1>
      </header>

      <div className="max-w-[460px] pb-10">
        <BookForm
          initial={initial}
          mode="edit"
          pending={pending}
          showShelf={false}
          showHint={false}
          onSubmit={handleSubmit}
        />
      </div>
    </AppShell>
  );
}
