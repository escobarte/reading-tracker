"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Input } from "./Input";
import { SegmentedControl } from "./SegmentedControl";
import { useLocale } from "@/i18n/LocaleProvider";
import type { BookFormat, BookShelf } from "@/lib/db/types";

export type BookFormValues = {
  title: string;
  author: string;
  total_pages: number | null;
  format: BookFormat;
  shelf: BookShelf;
  genre: string;
  series: string;
  series_number: number | null;
  tags: string[];
};

export const emptyBookFormValues: BookFormValues = {
  title: "",
  author: "",
  total_pages: null,
  format: "paper",
  shelf: "want",
  genre: "",
  series: "",
  series_number: null,
  tags: [],
};

type BookFormProps = {
  initial: BookFormValues;
  mode: "add" | "edit";
  pending: boolean;
  error?: string;
  onSubmit: (values: BookFormValues) => void;
  onDirty?: () => void;
  showShelf?: boolean;
  showHint?: boolean;
  duplicateBanner?: ReactNode;
};

export function BookForm({
  initial,
  mode,
  pending,
  error,
  onSubmit,
  onDirty,
  showShelf = true,
  showHint = true,
  duplicateBanner,
}: BookFormProps) {
  const { t } = useLocale();

  const [title, setTitle] = useState(initial.title);
  const [author, setAuthor] = useState(initial.author);
  const [pages, setPages] = useState(initial.total_pages ? String(initial.total_pages) : "");
  const [format, setFormat] = useState<BookFormat>(initial.format);
  const [shelf, setShelf] = useState<BookShelf>(initial.shelf);
  const [genre, setGenre] = useState(initial.genre);
  const [series, setSeries] = useState(initial.series);
  const [seriesNumber, setSeriesNumber] = useState(
    initial.series_number ? String(initial.series_number) : "",
  );
  const [tags, setTags] = useState(initial.tags.join(", "));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit({
      title: title.trim(),
      author: author.trim(),
      total_pages: pages.trim() && Number(pages) > 0 ? Number(pages) : null,
      format,
      shelf,
      genre: genre.trim(),
      series: series.trim(),
      series_number: seriesNumber.trim() ? Number(seriesNumber) : null,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-hero)]">
      <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{t.addbook.formTitle}</p>

      <Input
        label={t.addbook.fieldTitle}
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          onDirty?.();
        }}
        required
      />
      <Input
        label={t.addbook.fieldAuthor}
        value={author}
        onChange={(e) => {
          setAuthor(e.target.value);
          onDirty?.();
        }}
      />

      <div className="flex items-end gap-3">
        <div className="w-[120px]">
          <Input
            label={t.addbook.fieldPages}
            value={pages}
            onChange={(e) => setPages(e.target.value.replace(/[^\d]/g, ""))}
            numeric
            inputMode="numeric"
          />
        </div>
        <SegmentedControl
          aria-label={t.addbook.fieldPages}
          value={format}
          onChange={setFormat}
          options={[
            { value: "paper", label: t.addbook.formatPaper },
            { value: "ebook", label: t.addbook.formatEbook },
          ]}
        />
      </div>

      {showShelf && (
        <SegmentedControl
          aria-label={t.library.title}
          value={shelf === "reading" ? "reading" : "want"}
          onChange={(value) => setShelf(value as BookShelf)}
          options={[
            { value: "want", label: t.library.shelfWant },
            { value: "reading", label: t.library.shelfReading },
          ]}
        />
      )}

      <Input label={t.addbook.fieldGenre} value={genre} onChange={(e) => setGenre(e.target.value)} />

      <div className="flex gap-3">
        <div className="flex-1">
          <Input label={t.addbook.fieldSeries} value={series} onChange={(e) => setSeries(e.target.value)} />
        </div>
        <div className="w-[100px]">
          <Input
            label={t.addbook.fieldSeriesNumber}
            value={seriesNumber}
            onChange={(e) => setSeriesNumber(e.target.value.replace(/[^\d]/g, ""))}
            numeric
            inputMode="numeric"
          />
        </div>
      </div>

      <Input
        label={`${t.addbook.fieldTags} (${t.addbook.tagsHint})`}
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />

      {showHint && (
        <p className="font-serif text-sm text-muted">
          {pages.trim() ? t.addbook.pagesHint : t.addbook.pagesHintEmpty}
        </p>
      )}

      {error && <p className="font-serif text-sm text-deadline">{error}</p>}

      {duplicateBanner}

      <Button type="submit" disabled={pending || !title.trim()} className="h-14 w-full text-lg">
        {mode === "add"
          ? pending
            ? t.addbook.submitPending
            : t.addbook.submit
          : pending
            ? t.addbook.editSubmitPending
            : t.addbook.editSubmit}
      </Button>
    </form>
  );
}
