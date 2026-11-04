"use client";

import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { useLocale } from "@/i18n/LocaleProvider";
import { compressImage } from "@/lib/image";

type PhotoCaptureStepProps = {
  bookTitle: string;
  onClose: () => void;
  onFileSelected: (file: File) => void;
  error?: string | null;
};

type CameraStatus = "requesting" | "ready" | "denied" | "unsupported";

/** Нестандартные, но широко поддерживаемые возможности треков камеры (фонарь, режим фокуса) — отсутствуют в lib.dom.d.ts. */
type CameraTrackCapabilities = MediaTrackCapabilities & { torch?: boolean; focusMode?: string[] };
type CameraConstraintSet = MediaTrackConstraintSet & { torch?: boolean; focusMode?: string };

const MAX_DEBUG_LINES = 20;

export function PhotoCaptureStep({ bookTitle, onClose, onFileSelected, error }: PhotoCaptureStepProps) {
  const { t } = useLocale();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fallbackInputId = useId();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const logRef = useRef<(line: string) => void>(() => {});

  const [status, setStatus] = useState<CameraStatus>("requesting");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [flash, setFlash] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugLines, setDebugLines] = useState<string[]>([]);

  useEffect(() => {
    logRef.current = (line: string) => {
      setDebugLines((prev) => [...prev.slice(-(MAX_DEBUG_LINES - 1)), line]);
    };
  }, []);

  // Диагностика только для ?debug=1 — временно, для отладки живой камеры на устройствах.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebugEnabled(new URLSearchParams(window.location.search).get("debug") === "1");
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    setStatus("requesting");
    logRef.current("запрос доступа к камере");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 2560 }, height: { ideal: 1440 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as CameraTrackCapabilities | undefined;
      const settings = track.getSettings();
      logRef.current(`разрешение дано, поток ${settings.width ?? "?"}×${settings.height ?? "?"}`);

      const hasTorch = Boolean(capabilities?.torch);
      setTorchSupported(hasTorch);
      setTorchOn(false);
      logRef.current(`фонарь: ${hasTorch ? "доступен" : "недоступен"}`);

      if (capabilities?.focusMode?.includes("continuous")) {
        track.applyConstraints({ advanced: [{ focusMode: "continuous" } as CameraConstraintSet] }).catch(() => {});
      }

      setStatus("ready");
    } catch (err) {
      const name = err instanceof Error ? err.name : "unknown";
      logRef.current(`ошибка getUserMedia: ${name}`);
      setStatus("denied");
    }
  }, []);

  useEffect(() => {
    // Запуск через микротаск, а не синхронным вызовом в теле эффекта (react-hooks/set-state-in-effect).
    const id = window.setTimeout(() => startCamera(), 0);
    return () => {
      window.clearTimeout(id);
      stopStream();
    };
  }, [startCamera]);

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        logRef.current("страница скрыта — камера остановлена");
        stopStream();
      } else if (status !== "unsupported") {
        startCamera();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [startCamera, status]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onFileSelected(file);
  }

  function triggerFlash() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
  }

  async function handleShutter() {
    if (status !== "ready" || !videoRef.current) return;
    try {
      const bitmap = await createImageBitmap(videoRef.current);
      const compressed = await compressImage(bitmap, null, { maxDim: 1600, quality: 0.85 });
      bitmap.close();
      triggerFlash();
      onFileSelected(new File([compressed.blob], "capture.jpg", { type: "image/jpeg" }));
    } catch {
      logRef.current("не удалось захватить кадр");
    }
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupported) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as CameraConstraintSet] });
      setTorchOn(next);
    } catch {
      logRef.current("не удалось переключить фонарь");
    }
  }

  const showViewfinder = status === "ready" || status === "requesting";

  return (
    <div data-theme="dark" className="theme-surface flex h-dvh flex-col">
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-50 bg-paper transition-opacity duration-150 ${flash ? "opacity-80" : "opacity-0"}`}
      />

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
        <div className="relative aspect-[3/4] w-full max-w-[360px] overflow-hidden rounded-2xl bg-black">
          {status === "ready" && (
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
          )}

          {status === "requesting" && (
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <p className="text-center font-serif text-sm text-muted">{t.photoCapture.requestingPermission}</p>
            </div>
          )}

          {(status === "denied" || status === "unsupported") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
              {status === "denied" && <p className="font-serif text-sm text-muted">{t.photoCapture.noAccessHint}</p>}
              {status === "denied" && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="inline-flex h-11 items-center justify-center rounded-xl border-[1.5px] border-dashed border-stitch px-4 font-serif text-sm text-text"
                  >
                    {t.photoCapture.retryButton}
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="inline-flex h-11 items-center justify-center rounded-xl border-[1.5px] border-dashed border-stitch px-4 font-serif text-sm text-text"
                  >
                    {t.photoCapture.galleryButton}
                  </button>
                </div>
              )}
            </div>
          )}

          {showViewfinder && (
            <>
              <div aria-hidden="true" className="absolute left-0 top-0 h-11 w-11 border-l-[3px] border-t-[3px] border-accent" />
              <div aria-hidden="true" className="absolute right-0 top-0 h-11 w-11 border-r-[3px] border-t-[3px] border-accent" />
              <div aria-hidden="true" className="absolute bottom-0 left-0 h-11 w-11 border-b-[3px] border-l-[3px] border-accent" />
              <div aria-hidden="true" className="absolute bottom-0 right-0 h-11 w-11 border-b-[3px] border-r-[3px] border-accent" />
              <div className="absolute bottom-4 left-1/2 w-max -translate-x-1/2 rounded-full border border-dashed border-stitch bg-surface px-4 py-2">
                <p className="font-mono text-xs text-muted">{t.photoCapture.viewfinderHint}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && <p className="px-5 pb-2 text-center font-serif text-sm text-deadline">{error}</p>}

      <div className="flex items-center justify-between border-t-2 border-dashed border-stitch px-5 py-6 pb-[max(24px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="flex h-14 w-24 items-center justify-center rounded-xl border-[1.5px] border-dashed border-stitch text-center font-serif text-sm text-text"
        >
          {t.photoCapture.galleryButton}
        </button>

        {status === "unsupported" ? (
          <label
            htmlFor={fallbackInputId}
            aria-label={t.photoCapture.shutterLabel}
            className="flex h-[84px] w-[84px] items-center justify-center rounded-full border-4 border-paper"
          >
            <span aria-hidden="true" className="h-[62px] w-[62px] rounded-full bg-accent" />
          </label>
        ) : (
          <button
            type="button"
            onClick={handleShutter}
            disabled={status !== "ready"}
            aria-label={t.photoCapture.shutterLabel}
            className="flex h-[84px] w-[84px] items-center justify-center rounded-full border-4 border-paper disabled:opacity-50"
          >
            <span aria-hidden="true" className="h-[62px] w-[62px] rounded-full bg-accent" />
          </button>
        )}

        <button
          type="button"
          onClick={toggleTorch}
          aria-disabled={!torchSupported}
          aria-pressed={torchOn}
          className={`flex h-14 w-24 items-center justify-center rounded-xl border-[1.5px] border-dashed text-center font-serif text-sm ${
            torchSupported
              ? torchOn
                ? "border-accent bg-accent text-accent-on"
                : "border-stitch text-text"
              : "border-stitch text-muted opacity-60"
          }`}
        >
          {t.photoCapture.flashButton}
        </button>
      </div>

      {debugEnabled && debugLines.length > 0 && (
        // Временная диагностика камеры (?debug=1) — убрать, когда живая камера будет проверена на устройствах.
        <div className="max-h-28 overflow-y-auto border-t border-dashed border-stitch bg-surface px-4 py-2 font-mono text-[10px] text-muted">
          {debugLines.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      )}

      <input
        id={fallbackInputId}
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
