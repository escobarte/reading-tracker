"use client";

import { useState } from "react";
import { pauseBookAction, dropBookAction } from "@/app/books/[id]/actions";
import { Button } from "@/components/ui/Button";
import { Cover } from "@/components/ui/Cover";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import { DROP_REASON_CODES, PAUSE_REASON_CODES, pauseReasonLabel, type PauseReasonCode } from "@/lib/pause-reasons";

type PauseDropMode = "pause" | "drop";

type PauseDropDialogProps = {
  open: boolean;
  onClose: () => void;
  initialMode: PauseDropMode;
  bookId: string;
  bookTitle: string;
  coverUrl: string | null;
  currentPage: number;
  totalPages: number | null;
  onSaved: () => void;
};

export function PauseDropDialog({
  open,
  onClose,
  initialMode,
  bookId,
  bookTitle,
  coverUrl,
  currentPage,
  totalPages,
  onSaved,
}: PauseDropDialogProps) {
  const { t } = useLocale();
  const [mode, setMode] = useState<PauseDropMode>(initialMode);
  const [reason, setReason] = useState<PauseReasonCode | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  // Сброс полей формы при каждом открытии диалога — на свежем рендере, а не в
  // эффекте (react-hooks/set-state-in-effect: иначе каскадный лишний рендер).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMode(initialMode);
      setReason(null);
      setNote("");
      setNoteError(false);
      setError(false);
    }
  }

  const reasonCodes = mode === "pause" ? PAUSE_REASON_CODES : DROP_REASON_CODES;

  function handleModeChange(value: PauseDropMode) {
    setMode(value);
    setReason(null);
    setNoteError(false);
  }

  async function handleSave() {
    const trimmedNote = note.trim();
    if (reason === "other" && trimmedNote === "") {
      setNoteError(true);
      return;
    }
    setSaving(true);
    setError(false);
    try {
      if (mode === "pause") {
        await pauseBookAction(bookId, reason, trimmedNote || null);
      } else {
        await dropBookAction(bookId, reason, trimmedNote || null);
      }
      onSaved();
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  const percent = totalPages ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : null;
  const progressLine =
    totalPages && percent != null
      ? formatTemplate(t.pauseDialog.progressLine, { current: currentPage, total: totalPages, pagesUnit: t.book.pagesUnit, percent })
      : formatTemplate(t.pauseDialog.progressLineNoTotal, { current: currentPage, pagesUnit: t.book.pagesUnit });

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="pause-drop-dialog-title"
      variant="sheet"
      header={
        <div className="mb-4 flex items-center gap-3">
          <Cover title={bookTitle} coverUrl={coverUrl ?? undefined} size="search" />
          <div className="min-w-0">
            <h2 id="pause-drop-dialog-title" className="truncate font-serif text-lg font-bold text-text">
              {bookTitle}
            </h2>
            <p className="font-mono text-xs text-muted">{progressLine}</p>
          </div>
        </div>
      }
    >
      <SegmentedControl
        aria-label={t.pauseDialog.segmentedLabel}
        value={mode}
        onChange={handleModeChange}
        options={[
          { value: "pause", label: t.pauseDialog.segPause },
          { value: "drop", label: t.pauseDialog.segDrop },
        ]}
      />

      <div className="mt-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-muted">{t.pauseDialog.reasonLabel}</p>
        <div className="flex flex-wrap gap-2">
          {reasonCodes.map((code) => (
            <Pill
              key={code}
              type="button"
              active={reason === code}
              onClick={() => setReason((prev) => (prev === code ? null : code))}
            >
              {pauseReasonLabel(code, t)}
            </Pill>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="pause-drop-note" className="mb-2 block font-mono text-xs text-muted">
          {t.pauseDialog.noteLabel}
        </label>
        <textarea
          id="pause-drop-note"
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            if (noteError) setNoteError(false);
          }}
          placeholder={mode === "pause" ? t.pauseDialog.notePlaceholderPause : t.pauseDialog.notePlaceholderDrop}
          rows={3}
          maxLength={1000}
          className="min-h-[84px] w-full rounded-xl border-[1.5px] border-line bg-input p-3 font-serif text-base text-text outline-none placeholder:italic placeholder:text-muted focus:border-accent"
        />
        {noteError && <p className="mt-1 font-serif text-sm text-deadline">{t.pauseDialog.noteRequiredError}</p>}
      </div>

      <p className="mt-4 font-serif text-sm text-muted">
        {mode === "pause" ? t.pauseDialog.explanationPause : t.pauseDialog.explanationDrop}
      </p>

      {error && <p className="mt-3 font-serif text-sm text-deadline">{t.pauseDialog.errorGeneric}</p>}

      <div className="mt-5 flex flex-col gap-3 lg:flex-row-reverse lg:items-center">
        <Button onClick={handleSave} disabled={saving} className="w-full lg:w-auto lg:px-8">
          {saving ? t.pauseDialog.savingPending : mode === "pause" ? t.pauseDialog.saveButtonPause : t.pauseDialog.saveButtonDrop}
        </Button>
        <Button variant="text" onClick={onClose} disabled={saving} className="w-full lg:w-auto">
          {t.common.cancel}
        </Button>
      </div>
    </Modal>
  );
}
