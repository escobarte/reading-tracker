"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Stepper } from "@/components/ui/Stepper";
import { TagInput } from "./TagInput";
import { useLocale } from "@/i18n/LocaleProvider";
import {
  createNoteAction,
  deleteNoteAction,
  getNoteEditorDataAction,
  updateNoteAction,
  type NoteBookOption,
} from "@/app/notes/actions";
import type { Note, NoteType } from "@/lib/db/types";

export type NoteEditorTrigger =
  | { mode: "add"; defaultBookId?: string | null }
  | { mode: "edit"; note: Note };

type NoteEditorDialogProps = {
  open: boolean;
  onClose: () => void;
  trigger: NoteEditorTrigger | null;
  onSaved?: (note: Note) => void;
  onDeleted?: (id: string) => void;
};

export function NoteEditorDialog({ open, onClose, trigger, onSaved, onDeleted }: NoteEditorDialogProps) {
  const { t } = useLocale();
  const titleId = useId();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<NoteBookOption[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  const [type, setType] = useState<NoteType>("quote");
  const [bookId, setBookId] = useState("");
  const [body, setBody] = useState("");
  const [meaning, setMeaning] = useState("");
  const [page, setPage] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Сброс полей на свежем рендере при каждом открытии — не в эффекте, чтобы не ловить лишний
  // каскадный рендер (react-hooks/set-state-in-effect), как в DeadlineDialog.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && trigger) {
      setError(null);
      setConfirmDeleteOpen(false);
      setLoading(true);
      if (trigger.mode === "edit") {
        setType(trigger.note.type === "photo" ? "quote" : trigger.note.type);
        setBookId(trigger.note.book_id);
        setBody(trigger.note.body ?? "");
        setMeaning(trigger.note.meaning ?? "");
        setPage(trigger.note.page);
        setTags(trigger.note.tags);
      } else {
        setType("quote");
        setBookId(trigger.defaultBookId ?? "");
        setBody("");
        setMeaning("");
        setPage(null);
        setTags([]);
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getNoteEditorDataAction().then((data) => {
      if (cancelled) return;
      setBooks(data.books);
      setTagSuggestions(data.tagSuggestions);
      setLoading(false);
      if (trigger?.mode === "add") {
        const resolvedId = bookId || data.defaultBookId || data.books[0]?.id || "";
        if (resolvedId !== bookId) setBookId(resolvedId);
        const book = data.books.find((b) => b.id === resolvedId);
        setPage(book?.currentPage ?? 0);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- запускаем один раз на каждое открытие окна
  }, [open]);

  if (!open || !trigger) return null;

  function handleBookChange(nextId: string) {
    setBookId(nextId);
    setPage((prev) => {
      if (prev === null) return null;
      const book = books.find((b) => b.id === nextId);
      return book?.currentPage ?? 0;
    });
  }

  function handleRestorePage() {
    const book = books.find((b) => b.id === bookId);
    setPage(book?.currentPage ?? 0);
  }

  function handleSave() {
    if (pending || !trigger) return;
    if (!bookId) {
      setError(t.noteEditor.errorBook);
      return;
    }
    const input = {
      book_id: bookId,
      type,
      body,
      meaning: type === "word" ? meaning.trim() || null : null,
      page,
      tags,
    };
    startTransition(async () => {
      const result =
        trigger.mode === "edit" ? await updateNoteAction(trigger.note.id, input) : await createNoteAction(input);
      if (!result.ok) {
        setError(result.error === "empty" ? t.noteEditor.errorEmpty : t.noteEditor.errorTooLong);
        return;
      }
      onSaved?.(result.note);
      onClose();
    });
  }

  function handleDeleteConfirmed() {
    if (!trigger || trigger.mode !== "edit" || pending) return;
    const noteId = trigger.note.id;
    const noteBookId = trigger.note.book_id;
    startTransition(async () => {
      await deleteNoteAction(noteId, noteBookId);
      onDeleted?.(noteId);
      setConfirmDeleteOpen(false);
      onClose();
    });
  }

  const readingBooks = books.filter((b) => b.shelf === "reading");
  const doneBooks = books.filter((b) => b.shelf === "done");
  const noBooks = !loading && books.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      variant="sheet"
      header={
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-serif text-xl font-bold text-text">
            {trigger.mode === "edit" ? t.noteEditor.editTitle : t.noteEditor.addTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.noteEditor.close}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch text-text"
          >
            <Icon name="close" />
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <SegmentedControl<NoteType>
          aria-label={t.noteEditor.fieldText}
          value={type}
          onChange={setType}
          options={[
            { value: "quote", label: t.notes.typeQuote },
            { value: "thought", label: t.notes.typeThought },
            { value: "word", label: t.notes.typeWord },
          ]}
        />

        {noBooks ? (
          <p className="font-serif text-sm text-muted">{t.noteEditor.noBooks}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="note-book-select" className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
              {t.noteEditor.fieldBook}
            </label>
            <select
              id="note-book-select"
              value={bookId}
              onChange={(event) => handleBookChange(event.target.value)}
              disabled={loading}
              className="h-13 rounded-md border-[1.5px] border-line bg-input px-4 font-serif text-base text-text outline-none focus:border-2 focus:border-accent"
            >
              {readingBooks.length > 0 && (
                <optgroup label={t.noteEditor.bookGroupReading}>
                  {readingBooks.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.author ? `${book.title} — ${book.author}` : book.title}
                    </option>
                  ))}
                </optgroup>
              )}
              {doneBooks.length > 0 && (
                <optgroup label={t.noteEditor.bookGroupDone}>
                  {doneBooks.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.author ? `${book.title} — ${book.author}` : book.title}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="note-body" className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
            {type === "word" ? t.noteEditor.fieldWord : t.noteEditor.fieldText}
          </label>
          <textarea
            id="note-body"
            autoFocus
            rows={type === "word" ? 2 : 4}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="rounded-md border-[1.5px] border-line bg-input px-4 py-3 font-serif text-lg text-text outline-none focus:border-2 focus:border-accent"
          />
        </div>

        {type === "word" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="note-meaning" className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
              {t.noteEditor.fieldMeaning}
            </label>
            <textarea
              id="note-meaning"
              rows={2}
              value={meaning}
              onChange={(event) => setMeaning(event.target.value)}
              className="rounded-md border-[1.5px] border-line bg-input px-4 py-3 font-serif text-base text-text outline-none focus:border-2 focus:border-accent"
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted">{t.noteEditor.fieldPage}</p>
            <button
              type="button"
              onClick={() => (page === null ? handleRestorePage() : setPage(null))}
              className="min-h-11 px-2 font-serif text-sm text-accent"
            >
              {page === null ? t.noteEditor.pageAdd : t.noteEditor.pageRemove}
            </button>
          </div>
          {page !== null && (
            <Stepper
              value={page}
              onChange={setPage}
              decrementLabel={t.session.pageDecrementLabel}
              incrementLabel={t.session.pageIncrementLabel}
              inputLabel={t.noteEditor.fieldPage}
              min={0}
            />
          )}
        </div>

        <TagInput
          tags={tags}
          onChange={setTags}
          suggestions={tagSuggestions}
          label={t.noteEditor.fieldTags}
          placeholder={t.noteEditor.tagsPlaceholder}
          removeLabelTemplate={t.noteEditor.removeTagLabel}
        />

        {error && <p className="font-serif text-sm text-deadline">{error}</p>}

        <Button onClick={handleSave} disabled={pending || noBooks} className="h-14 w-full">
          {pending ? t.noteEditor.savePending : t.noteEditor.save}
        </Button>
        <Button variant="text" onClick={onClose} className="h-11 w-full justify-center">
          {t.noteEditor.cancel}
        </Button>
        {trigger.mode === "edit" && (
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={pending}
            className="h-11 w-full text-center font-serif text-base text-accent disabled:opacity-50"
          >
            {t.noteEditor.delete}
          </button>
        )}
      </div>

      <Modal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        titleId={`${titleId}-delete`}
        title={t.noteEditor.deleteConfirmTitle}
      >
        <div className="flex flex-col gap-3">
          <p className="font-serif text-sm text-muted">{t.noteEditor.deleteConfirmBody}</p>
          <Button onClick={handleDeleteConfirmed} disabled={pending} className="w-full">
            {t.noteEditor.deleteConfirmButton}
          </Button>
          <Button variant="text" onClick={() => setConfirmDeleteOpen(false)} className="w-full">
            {t.noteEditor.cancel}
          </Button>
        </div>
      </Modal>
    </Modal>
  );
}
