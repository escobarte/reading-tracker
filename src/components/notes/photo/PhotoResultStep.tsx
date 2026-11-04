"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StitchBar } from "@/components/ui/StitchBar";
import { Stepper } from "@/components/ui/Stepper";
import { PhotoThumbnail } from "@/components/notes/PhotoThumbnail";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatTemplate } from "@/i18n/format";
import type { NoteType } from "@/lib/db/types";

export type PhotoResultError = "limit" | "no_credit" | "generic" | null;

type PhotoResultStepProps = {
  bookTitle: string;
  bookAuthor: string | null;
  photoPreviewSrc: string;
  type: NoteType;
  onTypeChange: (type: NoteType) => void;
  body: string;
  onBodyChange: (body: string) => void;
  page: number;
  onPageChange: (page: number) => void;
  currentPage: number;
  recognizing: boolean;
  error: PhotoResultError;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  onRetry: () => void;
};

export function PhotoResultStep({
  bookTitle,
  bookAuthor,
  photoPreviewSrc,
  type,
  onTypeChange,
  body,
  onBodyChange,
  page,
  onPageChange,
  currentPage,
  recognizing,
  error,
  saving,
  onBack,
  onSave,
  onRetry,
}: PhotoResultStepProps) {
  const { t } = useLocale();
  const busy = recognizing || saving;
  const showEmptyHint = !recognizing && !error && body.trim().length === 0;

  return (
    <AppShell variant="focused">
      <div className="flex items-center gap-3 pb-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          aria-label={t.photoResult.backLabel}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch bg-surface text-text disabled:opacity-50"
        >
          <Icon name="back" />
        </button>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">{t.photoResult.eyebrow}</p>
          <h1 className="font-serif text-2xl font-bold leading-[1.15] text-text">{t.photoResult.heading}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
        <PhotoThumbnail src={photoPreviewSrc} seed={bookTitle} alt="" size="result" />
        <div className="min-w-0">
          <p className="truncate font-serif text-lg font-bold text-text">{bookTitle}</p>
          {bookAuthor && <p className="truncate font-serif text-sm text-muted">{bookAuthor}</p>}
          <p className="mt-1 font-serif text-sm text-accent">{t.photoResult.photoCaptionLink}</p>
        </div>
      </div>

      <div className="pt-4">
        <SegmentedControl<NoteType>
          aria-label={t.photoResult.fieldTextLabel}
          value={type === "photo" ? "quote" : type}
          onChange={onTypeChange}
          options={[
            { value: "quote", label: t.notes.typeQuote },
            { value: "thought", label: t.notes.typeThought },
            { value: "word", label: t.notes.typeWord },
          ]}
        />
      </div>

      <div className="flex items-center justify-between pb-1.5 pt-4">
        <label htmlFor="photo-result-body" className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
          {t.photoResult.fieldTextLabel}
        </label>
        <span className="font-mono text-xs text-muted">{formatTemplate(t.photoResult.charsCount, { count: body.length })}</span>
      </div>
      <textarea
        id="photo-result-body"
        value={body}
        onChange={(event) => onBodyChange(event.target.value)}
        disabled={recognizing}
        rows={6}
        className="min-h-[200px] rounded-xl border-2 border-accent bg-input px-4 py-3 font-serif text-lg text-text outline-none disabled:opacity-60"
      />

      {recognizing && (
        <div className="flex flex-col items-center gap-2 pt-3">
          <p className="font-serif text-sm text-muted">{t.photoResult.recognizing}</p>
          <div className="w-full motion-safe:animate-pulse">
            <StitchBar percent={70} />
          </div>
        </div>
      )}
      {!recognizing && error && (
        <p className="pt-3 font-serif text-sm text-deadline">
          {error === "limit"
            ? t.photoResult.errorLimit
            : error === "no_credit"
              ? t.photoResult.errorNoCredit
              : t.photoResult.errorGeneric}
        </p>
      )}
      {showEmptyHint && <p className="pt-3 font-serif text-sm text-muted">{t.photoResult.emptyHint}</p>}

      <div className="flex items-center justify-between pb-2 pt-5">
        <p className="font-serif text-lg font-bold text-text">{t.photoResult.fieldPageLabel}</p>
        <p className="font-mono text-xs text-muted">{formatTemplate(t.photoResult.currentPageCaption, { page: currentPage })}</p>
      </div>
      <Stepper
        value={page}
        onChange={onPageChange}
        decrementLabel={t.session.pageDecrementLabel}
        incrementLabel={t.session.pageIncrementLabel}
        inputLabel={t.photoResult.fieldPageLabel}
        min={0}
      />

      <Button onClick={onSave} disabled={busy} className="mt-6 h-14 w-full">
        {saving ? t.photoResult.savingPending : t.photoResult.saveButton}
      </Button>
      <button
        type="button"
        onClick={onRetry}
        disabled={busy}
        className="mt-3 h-11 w-full text-center font-serif text-base text-accent disabled:opacity-50"
      >
        {t.photoResult.retryButton}
      </button>
    </AppShell>
  );
}
