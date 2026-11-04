"use client";

import { Icon } from "@/components/ui/Icon";
import { useLocale } from "@/i18n/LocaleProvider";
import type { NormalizedRect } from "@/lib/image";
import { CropFrame } from "./CropFrame";

type PhotoSelectStepProps = {
  imageSrc: string;
  naturalWidth: number;
  naturalHeight: number;
  rect: NormalizedRect;
  onRectChange: (rect: NormalizedRect) => void;
  onBack: () => void;
  onRecognize: () => void;
  onRetake: () => void;
  onSaveAsPhoto: () => void;
  savingAsPhoto: boolean;
  error?: string | null;
};

export function PhotoSelectStep({
  imageSrc,
  naturalWidth,
  naturalHeight,
  rect,
  onRectChange,
  onBack,
  onRecognize,
  onRetake,
  onSaveAsPhoto,
  savingAsPhoto,
  error,
}: PhotoSelectStepProps) {
  const { t } = useLocale();

  return (
    <div data-theme="dark" className="theme-surface flex h-dvh flex-col">
      <div className="flex items-center gap-3 px-5 pt-[max(20px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onBack}
          aria-label={t.photoSelect.backLabel}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch text-text"
        >
          <Icon name="back" />
        </button>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">{t.photoSelect.eyebrow}</p>
          <p className="font-serif text-base font-bold text-text">{t.photoSelect.heading}</p>
        </div>
      </div>

      <div className="relative flex-1 px-5 py-4">
        <CropFrame
          imageSrc={imageSrc}
          naturalWidth={naturalWidth}
          naturalHeight={naturalHeight}
          rect={rect}
          onChange={onRectChange}
          handleLabels={{
            topLeft: t.photoSelect.handleTopLeft,
            topMid: t.photoSelect.handleTopMid,
            topRight: t.photoSelect.handleTopRight,
            bottomLeft: t.photoSelect.handleBottomLeft,
            bottomMid: t.photoSelect.handleBottomMid,
            bottomRight: t.photoSelect.handleBottomRight,
          }}
        />
      </div>

      <div className="px-5 pb-2">
        <p className="text-center font-mono text-xs text-muted">{t.photoSelect.hint}</p>
        {error && <p className="pt-2 text-center font-serif text-sm text-deadline">{error}</p>}
      </div>

      <div className="flex flex-col gap-3 border-t-2 border-dashed border-stitch px-5 py-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onRecognize}
          disabled={savingAsPhoto}
          className="flex h-[58px] w-full items-center justify-center rounded-xl bg-accent font-serif text-lg font-bold text-accent-on shadow-[var(--shadow-cta)] disabled:opacity-50"
        >
          {t.photoSelect.recognizeButton}
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRetake}
            disabled={savingAsPhoto}
            className="h-13 flex-1 rounded-xl border-[1.5px] border-dashed border-stitch font-serif text-base text-text disabled:opacity-50"
          >
            {t.photoSelect.retakeButton}
          </button>
          <button
            type="button"
            onClick={onSaveAsPhoto}
            disabled={savingAsPhoto}
            className="h-13 flex-1 rounded-xl border-[1.5px] border-dashed border-stitch font-serif text-base text-text disabled:opacity-50"
          >
            {savingAsPhoto ? t.photoSelect.savingAsPhoto : t.photoSelect.saveAsPhotoButton}
          </button>
        </div>
      </div>
    </div>
  );
}
