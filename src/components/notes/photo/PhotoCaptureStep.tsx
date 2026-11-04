"use client";

import { useRef, type ChangeEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { useLocale } from "@/i18n/LocaleProvider";

type PhotoCaptureStepProps = {
  bookTitle: string;
  onClose: () => void;
  onFileSelected: (file: File) => void;
  error?: string | null;
};

export function PhotoCaptureStep({ bookTitle, onClose, onFileSelected, error }: PhotoCaptureStepProps) {
  const { t } = useLocale();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onFileSelected(file);
  }

  return (
    <div data-theme="dark" className="theme-surface flex h-dvh flex-col">
      <div className="flex items-center justify-between px-5 pt-[max(20px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          aria-label={t.photoCapture.closeLabel}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-stitch text-text"
        >
          <Icon name="close" />
        </button>
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">{t.photoCapture.eyebrow}</p>
          <p className="font-serif text-base font-bold text-text">{bookTitle}</p>
        </div>
        <div className="h-12 w-12" aria-hidden="true" />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-8 py-6">
        <div className="relative aspect-[3/4] w-full max-w-[360px]">
          <div aria-hidden="true" className="absolute left-0 top-0 h-11 w-11 border-l-[3px] border-t-[3px] border-accent" />
          <div aria-hidden="true" className="absolute right-0 top-0 h-11 w-11 border-r-[3px] border-t-[3px] border-accent" />
          <div aria-hidden="true" className="absolute bottom-0 left-0 h-11 w-11 border-b-[3px] border-l-[3px] border-accent" />
          <div aria-hidden="true" className="absolute bottom-0 right-0 h-11 w-11 border-b-[3px] border-r-[3px] border-accent" />
          <div className="absolute bottom-4 left-1/2 w-max -translate-x-1/2 rounded-full border border-dashed border-stitch bg-surface px-4 py-2">
            <p className="font-mono text-xs text-muted">{t.photoCapture.viewfinderHint}</p>
          </div>
        </div>
      </div>

      {error && (
        <p className="px-5 pb-2 text-center font-serif text-sm text-deadline">{error}</p>
      )}

      <div className="flex items-center justify-between border-t-2 border-dashed border-stitch px-5 py-6 pb-[max(24px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="flex h-14 w-24 items-center justify-center rounded-xl border-[1.5px] border-dashed border-stitch text-center font-serif text-sm text-text"
        >
          {t.photoCapture.galleryButton}
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          aria-label={t.photoCapture.shutterLabel}
          className="flex h-[84px] w-[84px] items-center justify-center rounded-full border-4 border-paper"
        >
          <span aria-hidden="true" className="h-[62px] w-[62px] rounded-full bg-accent" />
        </button>
        <button
          type="button"
          aria-disabled="true"
          className="flex h-14 w-24 items-center justify-center rounded-xl border-[1.5px] border-dashed border-stitch text-center font-serif text-sm text-muted opacity-60"
        >
          {t.photoCapture.flashButton}
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  );
}
