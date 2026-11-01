"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Dropdown } from "@/components/ui/Dropdown";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { NoteCard } from "@/components/notes/NoteCard";
import { NoteEditorDialog, type NoteEditorTrigger } from "@/components/notes/NoteEditorDialog";
import { toggleNoteFavoriteAction } from "@/app/notes/actions";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import { addDays } from "@/lib/goals";
import { noteDayGroup } from "@/lib/notes";
import { formatHistoryDate, localDateKey } from "@/lib/time";
import type { Note, NoteType } from "@/lib/db/types";
import type { NoteWithBook } from "@/lib/db/notes";

type NotesFilters = { type: NoteType | null; favorite: boolean; bookId: string | null; query: string };

type NotesViewProps = {
  notes: NoteWithBook[];
  hasMore: boolean;
  limit: number;
  filters: NotesFilters;
  filterBookTitle: string | null;
  today: { pages: number; goal: number };
};

const TYPE_PILLS: { value: NoteType | "all"; key: "filterAll" | "typeQuote" | "typeThought" | "typeWord" }[] = [
  { value: "all", key: "filterAll" },
  { value: "quote", key: "typeQuote" },
  { value: "thought", key: "typeThought" },
  { value: "word", key: "typeWord" },
];

export function NotesView({ notes, hasMore, limit, filters, filterBookTitle, today }: NotesViewProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [searchOpen, setSearchOpen] = useState(Boolean(filters.query));
  const [queryText, setQueryText] = useState(filters.query);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [trigger, setTrigger] = useState<NoteEditorTrigger | null>(null);

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (queryText === current) return;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (queryText.trim()) params.set("q", queryText);
      else params.delete("q");
      params.delete("limit");
      const qs = params.toString();
      startTransition(() => router.replace(qs ? `/notes?${qs}` : "/notes", { scroll: false }));
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce по вводу, остальное читаем напрямую из searchParams
  }, [queryText]);

  function setFilter(key: "type" | "favorite" | "book", value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("limit");
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `/notes?${qs}` : "/notes", { scroll: false }));
  }

  function showMore() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", String(limit + 30));
    startTransition(() => router.replace(`/notes?${params.toString()}`, { scroll: false }));
  }

  function openAdd() {
    setTrigger({ mode: "add", defaultBookId: filters.bookId });
    setDialogOpen(true);
  }
  function openEdit(note: Note) {
    setTrigger({ mode: "edit", note });
    setDialogOpen(true);
  }

  function handleToggleFavorite(note: NoteWithBook) {
    startTransition(() => {
      toggleNoteFavoriteAction(note.id, !note.is_favorite, note.book_id).then(() => router.refresh());
    });
  }

  const exportParams = new URLSearchParams();
  if (filters.type) exportParams.set("type", filters.type);
  if (filters.favorite) exportParams.set("favorite", "1");
  if (filters.bookId) exportParams.set("book", filters.bookId);
  if (filters.query) exportParams.set("q", filters.query);
  const exportHref = `/notes/export?${exportParams.toString()}`;

  const todayKey = localDateKey(new Date());
  const yesterdayKey = addDays(todayKey, -1);

  const rows = useMemo(() => {
    return notes.map((note, index) => {
      const dateKey = localDateKey(note.created_at);
      const prevDateKey = index > 0 ? localDateKey(notes[index - 1].created_at) : null;
      const showHeader = dateKey !== prevDateKey;
      const group = noteDayGroup(dateKey, todayKey, yesterdayKey);
      const label =
        group === "today" ? t.notes.groupToday : group === "yesterday" ? t.notes.groupYesterday : formatHistoryDate(note.created_at, locale);
      return { note, showHeader, label };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- todayKey/yesterdayKey пересчитываются на каждый рендер, не нужны в зависимостях
  }, [notes, locale, t]);

  return (
    <AppShell variant="narrow" today={today}>
      <header className="flex items-start justify-between gap-3 py-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">{t.common.appName}</p>
          <h1 className="font-serif text-[28px] font-bold leading-[1.15] text-text lg:text-[34px]">{t.notes.title}</h1>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            aria-label={t.notes.searchLabel}
            onClick={() => setSearchOpen((v) => !v)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
          >
            <Icon name="search" />
          </button>
          <button
            type="button"
            aria-label={t.notes.addLabel}
            onClick={openAdd}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-on"
          >
            <Icon name="plus" />
          </button>
          <Dropdown
            trigger={<Icon name="more" />}
            triggerLabel={t.notes.moreLabel}
            align="right"
            showChevron={false}
            triggerClassName="inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text"
            items={[{ label: t.notes.exportMenuItem, href: exportHref }]}
          />
        </div>
      </header>

      {searchOpen && (
        <div className="pb-4">
          <input
            autoFocus
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder={t.notes.searchPlaceholder}
            aria-label={t.notes.searchLabel}
            className="h-12 w-full rounded-xl border-[1.5px] border-line bg-input px-4 font-serif text-base text-text outline-none focus:border-2 focus:border-accent"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pb-3">
        {TYPE_PILLS.map((pill) => (
          <Pill
            key={pill.value}
            active={pill.value === "all" ? !filters.type : filters.type === pill.value}
            onClick={() => setFilter("type", pill.value === "all" ? null : pill.value)}
          >
            {t.notes[pill.key]}
          </Pill>
        ))}
        <Pill active={filters.favorite} onClick={() => setFilter("favorite", filters.favorite ? null : "1")}>
          <Icon name="favorite" width={14} height={14} aria-hidden="true" style={filters.favorite ? { fill: "currentColor" } : undefined} />
          {t.notes.filterFavorite}
        </Pill>
      </div>

      {filterBookTitle && (
        <div className="pb-4">
          <button
            type="button"
            onClick={() => setFilter("book", null)}
            aria-label={formatTemplate(t.notes.bookFilterClear, { title: filterBookTitle })}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-dashed border-stitch bg-surface px-3 font-mono text-xs text-muted"
          >
            {filterBookTitle}
            <Icon name="close" width={12} height={12} aria-hidden="true" />
          </button>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="py-10 text-center font-serif text-lg text-muted">
          {filters.query || filters.type || filters.favorite || filters.bookId ? t.notes.emptySearch : t.notes.emptyNone}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
          {rows.map(({ note, showHeader, label }) => {
            const caption = note.bookTitle
              ? note.page != null
                ? formatTemplate(t.notes.cardPageCaption, { book: note.bookTitle, page: note.page })
                : formatTemplate(t.notes.cardBookCaption, { book: note.bookTitle })
              : null;

            return (
              <div key={note.id} className="contents">
                {showHeader && (
                  <p className="mt-2 font-mono text-xs uppercase tracking-[0.1em] text-muted lg:col-span-2">{label}</p>
                )}
                <NoteCard
                  type={note.type}
                  typeLabel={note.type === "quote" ? t.notes.typeQuote : note.type === "word" ? t.notes.typeWord : t.notes.typeThought}
                  body={note.body}
                  meaning={note.meaning}
                  caption={caption}
                  isFavorite={note.is_favorite}
                  favoriteLabel={note.is_favorite ? t.notes.favoriteOn : t.notes.favoriteOff}
                  tags={note.tags}
                  onOpen={() => openEdit(note)}
                  onToggleFavorite={() => handleToggleFavorite(note)}
                />
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={showMore}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-xl border-[1.5px] border-dashed border-stitch bg-surface font-serif text-sm text-text"
        >
          {t.notes.showMore}
        </button>
      )}

      <NoteEditorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        trigger={trigger}
        onSaved={() => router.refresh()}
        onDeleted={() => router.refresh()}
      />
    </AppShell>
  );
}
