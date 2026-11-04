"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoCaptureStep } from "@/components/notes/photo/PhotoCaptureStep";
import { PhotoSelectStep } from "@/components/notes/photo/PhotoSelectStep";
import { PhotoResultStep, type PhotoResultError } from "@/components/notes/photo/PhotoResultStep";
import { useLocale } from "@/i18n/LocaleProvider";
import { bitmapFromFile, compressImage, type NormalizedRect } from "@/lib/image";
import { createNoteWithPhotoAction, createPhotoNoteAction } from "@/app/notes/actions";
import type { Book, NoteType } from "@/lib/db/types";

type Step = "capture" | "select" | "result";

type CapturedPhoto = { bitmap: ImageBitmap; displayUrl: string };
type ResultPhoto = { fullBase64: string; previewUrl: string; cropBase64: string };

const DEFAULT_RECT: NormalizedRect = { left: 0.1, top: 0.35, right: 0.9, bottom: 0.65 };

export function PhotoNoteWizard({ book, currentPage }: { book: Book; currentPage: number }) {
  const { t } = useLocale();
  const router = useRouter();

  const [step, setStep] = useState<Step>("capture");
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [rect, setRect] = useState<NormalizedRect>(DEFAULT_RECT);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [savingAsPhoto, setSavingAsPhoto] = useState(false);

  const [resultPhoto, setResultPhoto] = useState<ResultPhoto | null>(null);
  const [noteType, setNoteType] = useState<NoteType>("quote");
  const [body, setBody] = useState("");
  const [page, setPage] = useState(currentPage);
  const [recognizing, setRecognizing] = useState(false);
  const [ocrError, setOcrError] = useState<PhotoResultError>(null);
  const [saving, setSaving] = useState(false);

  // Освобождаем ImageBitmap и URL.createObjectURL при замене снимка и при размонтировании мастера.
  useEffect(() => {
    return () => {
      photo?.bitmap.close();
      if (photo?.displayUrl) URL.revokeObjectURL(photo.displayUrl);
    };
  }, [photo]);
  useEffect(() => {
    return () => {
      if (resultPhoto?.previewUrl) URL.revokeObjectURL(resultPhoto.previewUrl);
    };
  }, [resultPhoto]);

  const exitedRef = useRef(false);
  function exitWizard() {
    if (exitedRef.current) return;
    exitedRef.current = true;
    router.refresh();
    router.back();
  }

  async function handleFileSelected(file: File) {
    setWizardError(null);
    try {
      const bitmap = await bitmapFromFile(file);
      const display = await compressImage(bitmap, null, { maxDim: 1200, quality: 0.9 });
      setPhoto({ bitmap, displayUrl: URL.createObjectURL(display.blob) });
      setRect(DEFAULT_RECT);
      setStep("select");
    } catch {
      setWizardError(t.photoCapture.decodeError);
    }
  }

  function goToCapture() {
    setPhoto(null);
    setWizardError(null);
    setStep("capture");
  }

  async function handleSaveAsPhoto() {
    if (!photo || savingAsPhoto) return;
    setSavingAsPhoto(true);
    setWizardError(null);
    try {
      const full = await compressImage(photo.bitmap, null, { maxDim: 1600, quality: 0.85 });
      const result = await createPhotoNoteAction(book.id, currentPage, full.base64);
      if (!result.ok) {
        setWizardError(t.photoResult.errorGeneric);
        return;
      }
      exitWizard();
    } catch {
      setWizardError(t.photoResult.errorGeneric);
    } finally {
      setSavingAsPhoto(false);
    }
  }

  async function runOcr(cropBase64: string) {
    setRecognizing(true);
    setOcrError(null);
    try {
      const response = await fetch("/api/notes/ocr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: cropBase64, mimeType: "image/jpeg", language: book.language }),
      });
      if (response.status === 429) {
        setOcrError("limit");
        return;
      }
      if (response.status === 402) {
        setOcrError("no_credit");
        return;
      }
      if (!response.ok) {
        setOcrError("generic");
        return;
      }
      const data = (await response.json()) as { text: string };
      setBody(data.text);
    } catch {
      setOcrError("generic");
    } finally {
      setRecognizing(false);
    }
  }

  async function handleRecognize() {
    if (!photo) return;
    try {
      const full = await compressImage(photo.bitmap, null, { maxDim: 1600, quality: 0.85 });
      const crop = await compressImage(photo.bitmap, rect, { maxDim: 1600, quality: 0.85, maxBytes: 1_000_000 });
      setResultPhoto((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return { fullBase64: full.base64, previewUrl: URL.createObjectURL(full.blob), cropBase64: crop.base64 };
      });
      setNoteType("quote");
      setBody("");
      setPage(currentPage);
      setOcrError(null);
      setStep("result");
      await runOcr(crop.base64);
    } catch {
      setWizardError(t.photoCapture.decodeError);
    }
  }

  function handleRetry() {
    if (!resultPhoto || recognizing || saving) return;
    runOcr(resultPhoto.cropBase64);
  }

  async function handleSaveNote() {
    if (!resultPhoto || saving || recognizing) return;
    setSaving(true);
    try {
      const result = await createNoteWithPhotoAction(book.id, noteType, body, page, resultPhoto.fullBase64);
      if (!result.ok) {
        setOcrError("generic");
        return;
      }
      exitWizard();
    } finally {
      setSaving(false);
    }
  }

  if (step === "capture" || !photo) {
    return (
      <PhotoCaptureStep
        bookTitle={book.title}
        onClose={exitWizard}
        onFileSelected={handleFileSelected}
        error={wizardError}
      />
    );
  }

  if (step === "select") {
    return (
      <PhotoSelectStep
        imageSrc={photo.displayUrl}
        naturalWidth={photo.bitmap.width}
        naturalHeight={photo.bitmap.height}
        rect={rect}
        onRectChange={setRect}
        onBack={goToCapture}
        onRecognize={handleRecognize}
        onRetake={goToCapture}
        onSaveAsPhoto={handleSaveAsPhoto}
        savingAsPhoto={savingAsPhoto}
        error={wizardError}
      />
    );
  }

  if (!resultPhoto) return null;

  return (
    <PhotoResultStep
      bookTitle={book.title}
      bookAuthor={book.author}
      photoPreviewSrc={resultPhoto.previewUrl}
      type={noteType}
      onTypeChange={setNoteType}
      body={body}
      onBodyChange={setBody}
      page={page}
      onPageChange={setPage}
      currentPage={currentPage}
      recognizing={recognizing}
      error={ocrError}
      saving={saving}
      onBack={() => setStep("select")}
      onSave={handleSaveNote}
      onRetry={handleRetry}
    />
  );
}
