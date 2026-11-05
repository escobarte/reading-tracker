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

/**
 * "starting" — поток получен, но <video> ещё не отдал ни одного кадра (videoWidth === 0).
 * "ready" ставится только по loadedmetadata/playing/resize с videoWidth > 0, не по факту getUserMedia.
 */
type CameraStatus = "requesting" | "starting" | "ready" | "denied" | "timeout" | "unsupported";

/** Нестандартные, но широко поддерживаемые возможности треков камеры (фонарь, режим фокуса) — отсутствуют в lib.dom.d.ts. */
type CameraTrackCapabilities = MediaTrackCapabilities & { torch?: boolean; focusMode?: string[]; pointsOfInterest?: unknown };
type CameraTrackSettings = MediaTrackSettings & { focusMode?: string };
type CameraPointOfInterest = { x: number; y: number };
type CameraConstraintSet = MediaTrackConstraintSet & {
  torch?: boolean;
  focusMode?: string;
  pointsOfInterest?: CameraPointOfInterest[];
};
type FocusCapabilities = { modes: string[]; pointsOfInterest: boolean };

const MAX_DEBUG_LINES = 40;
const READY_TIMEOUT_MS = 4000;

function errName(err: unknown): string {
  return err instanceof Error ? err.name : "unknown";
}
function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : "";
}
/** Метка времени для журнала диагностики — мс с начала загрузки страницы, без локали. */
function nowMs(): string {
  return `${Math.round(performance.now())}ms`;
}

export function PhotoCaptureStep({ bookTitle, onClose, onFileSelected, error }: PhotoCaptureStepProps) {
  const { t } = useLocale();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fallbackInputId = useId();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestInFlightRef = useRef(false);
  const readyTimeoutRef = useRef<number | undefined>(undefined);
  const logRef = useRef<(line: string) => void>(() => {});
  const focusCapsRef = useRef<FocusCapabilities>({ modes: [], pointsOfInterest: false });
  const focusRingIdRef = useRef(0);

  const [status, setStatus] = useState<CameraStatus>("requesting");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [flash, setFlash] = useState(false);
  const [hasTapped, setHasTapped] = useState(false);
  const [focusRing, setFocusRing] = useState<{ x: number; y: number; id: number } | null>(null);
  const [focusRingFading, setFocusRingFading] = useState(false);
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

  const setVideoReadyState = useCallback((ready: boolean) => {
    setStatus((prev) => {
      if (!ready) return prev === "ready" ? "starting" : prev;
      if (prev === "denied" || prev === "unsupported") return prev;
      return "ready";
    });
  }, []);

  const stopStream = useCallback(() => {
    window.clearTimeout(readyTimeoutRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setVideoReadyState(false);
  }, [setVideoReadyState]);

  function logContainerRect(label: string) {
    const rect = containerRef.current?.getBoundingClientRect();
    logRef.current(`${nowMs()} ${label}: контейнер ${Math.round(rect?.width ?? 0)}×${Math.round(rect?.height ?? 0)}`);
  }

  /** Применяет focusMode/pointsOfInterest через advanced-констрейнт, логируя settings.focusMode до/после и результат. */
  async function applyFocusConstraints(track: MediaStreamTrack, constraint: CameraConstraintSet, label: string): Promise<boolean> {
    const before = (track.getSettings() as CameraTrackSettings).focusMode ?? "?";
    logRef.current(`${nowMs()} ${label}: focusMode до=${before}`);
    try {
      await track.applyConstraints({ advanced: [constraint] });
      const after = (track.getSettings() as CameraTrackSettings).focusMode ?? "?";
      logRef.current(`${nowMs()} ${label}: ok, focusMode после=${after}`);
      return true;
    } catch (err) {
      logRef.current(`${nowMs()} ${label}: ошибка ${errName(err)} ${errMessage(err)}`);
      return false;
    }
  }

  const startCamera = useCallback(async () => {
    if (requestInFlightRef.current) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      logRef.current(`${nowMs()} getUserMedia не поддерживается`);
      setStatus("unsupported");
      return;
    }

    requestInFlightRef.current = true;
    setStatus("requesting");
    logRef.current(`${nowMs()} getUserMedia: запрос разрешения (мягкие ограничения)`);

    let stream: MediaStream;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch (softErr) {
        logRef.current(`${nowMs()} getUserMedia(environment) ошибка: ${errName(softErr)} ${errMessage(softErr)} — повтор без facingMode`);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
    } catch (err) {
      requestInFlightRef.current = false;
      logRef.current(`${nowMs()} getUserMedia ошибка: ${errName(err)} ${errMessage(err)}`);
      setStatus("denied");
      return;
    }
    requestInFlightRef.current = false;

    streamRef.current = stream;
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    logRef.current(
      `${nowMs()} getUserMedia: разрешение получено, трек label="${track.label}" readyState=${track.readyState} settings=${settings.width ?? "?"}×${settings.height ?? "?"}`,
    );

    setStatus("starting");
    window.clearTimeout(readyTimeoutRef.current);
    readyTimeoutRef.current = window.setTimeout(() => {
      if (!(videoRef.current && videoRef.current.videoWidth > 0)) {
        logRef.current(`${nowMs()} таймаут: нет кадров от камеры за ${READY_TIMEOUT_MS}мс`);
        setStatus("timeout");
      }
    }, READY_TIMEOUT_MS);

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
        logRef.current(`${nowMs()} video.play() выполнен`);
      } catch (playErr) {
        logRef.current(`${nowMs()} video.play() ошибка: ${errMessage(playErr)}`);
      }
    }
    logContainerRect("после подключения потока");

    // Желаемое разрешение — лучше с ним, но поток и без него рабочий.
    try {
      await track.applyConstraints({ width: { ideal: 1920 }, height: { ideal: 1080 } });
    } catch (resErr) {
      logRef.current(`${nowMs()} applyConstraints(резолюция) ошибка: ${errMessage(resErr)}`);
    }

    const capabilities = track.getCapabilities?.() as CameraTrackCapabilities | undefined;
    const hasTorch = Boolean(capabilities?.torch);
    setTorchSupported(hasTorch);
    setTorchOn(false);
    logRef.current(`${nowMs()} фонарь: ${hasTorch ? "доступен" : "недоступен"}`);

    const focusModes = capabilities?.focusMode ?? [];
    const hasPointsOfInterest = Boolean(capabilities?.pointsOfInterest);
    focusCapsRef.current = { modes: focusModes, pointsOfInterest: hasPointsOfInterest };
    logRef.current(`${nowMs()} focusMode поддерживаемые: ${focusModes.length ? focusModes.join(", ") : "нет"}`);
    logRef.current(`${nowMs()} pointsOfInterest: ${hasPointsOfInterest ? "поддерживается" : "нет"}`);

    if (focusModes.includes("continuous")) {
      await applyFocusConstraints(track, { focusMode: "continuous" }, "начальный фокус");
    } else if (focusModes.includes("single-shot")) {
      logRef.current(`${nowMs()} continuous недоступен — single-shot будет применяться по тапу и перед съёмкой`);
    }
  }, []);

  // Поток стартует только при монтировании/ретрае/возврате видимости — не создаём/не убираем <video> условным рендером.
  useEffect(() => {
    // Запуск через микротаск, а не синхронным вызовом в теле эффекта (react-hooks/set-state-in-effect).
    const id = window.setTimeout(() => startCamera(), 0);
    return () => {
      window.clearTimeout(id);
      stopStream();
    };
  }, [startCamera, stopStream]);

  useEffect(() => {
    function handleVisibility() {
      logRef.current(`${nowMs()} visibilitychange: ${document.visibilityState}`);
      if (document.hidden) {
        // На Android системный диалог разрешения на камеру тоже скрывает страницу — пока запрос
        // в полёте, треки не трогаем, иначе только выданное разрешение само себя обнулит.
        if (requestInFlightRef.current) {
          logRef.current(`${nowMs()} страница скрыта во время запроса разрешения — поток не трогаем`);
          return;
        }
        logRef.current(`${nowMs()} страница скрыта — камера остановлена`);
        stopStream();
      } else if (status !== "unsupported" && !streamRef.current && !requestInFlightRef.current) {
        startCamera();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [startCamera, status, stopStream]);

  // <video> всегда в разметке — слушатели вешаются один раз на весь жизненный цикл компонента.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function handleLoadedMetadata() {
      logRef.current(`${nowMs()} video loadedmetadata: ${video!.videoWidth}×${video!.videoHeight}`);
      logContainerRect("loadedmetadata");
      setVideoReadyState(video!.videoWidth > 0);
    }
    function handlePlaying() {
      logRef.current(`${nowMs()} video playing: ${video!.videoWidth}×${video!.videoHeight}`);
      logContainerRect("playing");
      setVideoReadyState(video!.videoWidth > 0);
    }
    function handleResize() {
      logRef.current(`${nowMs()} video resize: ${video!.videoWidth}×${video!.videoHeight}`);
      setVideoReadyState(video!.videoWidth > 0);
    }
    function handleError() {
      logRef.current(`${nowMs()} video error`);
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("resize", handleResize);
    video.addEventListener("error", handleError);
    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("resize", handleResize);
      video.removeEventListener("error", handleError);
    };
  }, [setVideoReadyState]);

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
    const video = videoRef.current;
    if (status !== "ready" || !video || video.videoWidth === 0) return;
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) await preFocusBeforeShutter(track);
    try {
      let blob: Blob;
      try {
        const bitmap = await createImageBitmap(video);
        const compressed = await compressImage(bitmap, null, { maxDim: 1600, quality: 0.85 });
        bitmap.close();
        blob = compressed.blob;
      } catch {
        logRef.current(`${nowMs()} createImageBitmap(video) не удался — запасной путь через canvas`);
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas_unsupported");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const canvasBitmap = await createImageBitmap(canvas);
        const compressed = await compressImage(canvasBitmap, null, { maxDim: 1600, quality: 0.85 });
        canvasBitmap.close();
        blob = compressed.blob;
      }
      triggerFlash();
      onFileSelected(new File([blob], "capture.jpg", { type: "image/jpeg" }));
    } catch {
      logRef.current(`${nowMs()} не удалось захватить кадр`);
    }
    if (track && focusCapsRef.current.modes.includes("continuous")) {
      applyFocusConstraints(track, { focusMode: "continuous" }, "после съёмки: возврат continuous").catch(() => {});
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
      logRef.current(`${nowMs()} не удалось переключить фонарь`);
    }
  }

  /** Координата тапа (в px контейнера) → нормированная точка 0..1 в исходном кадре, с учётом обрезки object-fit: cover. */
  function mapTapToNormalizedPoint(clientX: number, clientY: number): CameraPointOfInterest | null {
    const video = videoRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!video || !rect || video.videoWidth === 0 || video.videoHeight === 0) return null;

    const scale = Math.max(rect.width / video.videoWidth, rect.height / video.videoHeight);
    const displayedWidth = video.videoWidth * scale;
    const displayedHeight = video.videoHeight * scale;
    const offsetX = (displayedWidth - rect.width) / 2;
    const offsetY = (displayedHeight - rect.height) / 2;

    const sourceX = (clientX - rect.left + offsetX) / scale;
    const sourceY = (clientY - rect.top + offsetY) / scale;

    return {
      x: Math.min(1, Math.max(0, sourceX / video.videoWidth)),
      y: Math.min(1, Math.max(0, sourceY / video.videoHeight)),
    };
  }

  function showFocusRing(x: number, y: number) {
    const id = ++focusRingIdRef.current;
    setFocusRingFading(false);
    setFocusRing({ x, y, id });
    window.setTimeout(() => setFocusRingFading(true), 20);
    window.setTimeout(() => {
      setFocusRing((curr) => (curr?.id === id ? null : curr));
    }, 800);
  }

  /** Перефокус по тапу: точка интереса, если поддерживается, иначе короткий пульс single-shot/manual. */
  async function refocusAtPoint(clientX: number, clientY: number) {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const caps = focusCapsRef.current;

    if (caps.pointsOfInterest) {
      const point = mapTapToNormalizedPoint(clientX, clientY);
      if (!point) return;
      const ok = await applyFocusConstraints(track, { focusMode: "single-shot", pointsOfInterest: [point] }, "тап-фокус (точка)");
      if (ok && caps.modes.includes("continuous")) {
        await applyFocusConstraints(track, { focusMode: "continuous" }, "тап-фокус: возврат continuous");
      }
      return;
    }

    const pulseMode = caps.modes.includes("single-shot") ? "single-shot" : caps.modes.includes("manual") ? "manual" : null;
    if (!pulseMode) return;
    await applyFocusConstraints(track, { focusMode: pulseMode }, "тап-фокус (перефокус)");
    await new Promise((resolve) => window.setTimeout(resolve, 150));
    if (caps.modes.includes("continuous")) {
      await applyFocusConstraints(track, { focusMode: "continuous" }, "тап-фокус: возврат continuous");
    }
  }

  function handleViewfinderTap(event: { clientX: number; clientY: number }) {
    if (status !== "ready") return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    showFocusRing(event.clientX - rect.left, event.clientY - rect.top);
    setHasTapped(true);
    refocusAtPoint(event.clientX, event.clientY).catch(() => {});
  }

  /** Короткий перефокус перед съёмкой — не ждём дольше 300 мс, даже если applyConstraints зависнет. */
  async function preFocusBeforeShutter(track: MediaStreamTrack) {
    const caps = focusCapsRef.current;
    const mode = caps.modes.includes("single-shot") ? "single-shot" : caps.modes.includes("manual") ? "manual" : null;
    if (!mode) return;
    const constraint: CameraConstraintSet = caps.pointsOfInterest ? { focusMode: mode, pointsOfInterest: [{ x: 0.5, y: 0.5 }] } : { focusMode: mode };
    await Promise.race([
      applyFocusConstraints(track, constraint, "перефокус перед съёмкой"),
      new Promise((resolve) => window.setTimeout(resolve, 300)),
    ]);
  }

  const showOverlayMessage = status !== "ready" && status !== "unsupported";
  const showFrameGuide = status !== "denied" && status !== "timeout";
  const showRetryButtons = status === "denied" || status === "timeout";

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

      <div className="relative flex flex-1 flex-col items-center justify-center gap-3 px-8 py-6">
        <div
          ref={containerRef}
          onClick={handleViewfinderTap}
          className="relative aspect-[3/4] w-full max-w-[360px] overflow-hidden rounded-2xl bg-black"
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 z-0 h-full w-full object-cover"
          />

          {focusRing && (
            <div
              aria-hidden="true"
              style={{ left: focusRing.x, top: focusRing.y }}
              className={`pointer-events-none absolute z-20 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent transition-[opacity,transform] duration-700 ease-out ${
                focusRingFading ? "scale-75 opacity-0" : "scale-100 opacity-100"
              }`}
            />
          )}

          {showOverlayMessage && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-surface/90 px-6 text-center">
              {status === "requesting" && <p className="font-serif text-sm text-muted">{t.photoCapture.requestingPermission}</p>}
              {status === "starting" && <p className="font-serif text-sm text-muted">{t.photoCapture.startingCamera}</p>}
              {status === "denied" && <p className="font-serif text-sm text-muted">{t.photoCapture.noAccessHint}</p>}
              {status === "timeout" && <p className="font-serif text-sm text-muted">{t.photoCapture.noFrameHint}</p>}
              {showRetryButtons && (
                <div className="pointer-events-auto flex gap-3">
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

          {showFrameGuide && (
            <div className="pointer-events-none absolute inset-0 z-10">
              <div aria-hidden="true" className="absolute left-0 top-0 h-11 w-11 border-l-[3px] border-t-[3px] border-accent" />
              <div aria-hidden="true" className="absolute right-0 top-0 h-11 w-11 border-r-[3px] border-t-[3px] border-accent" />
              <div aria-hidden="true" className="absolute bottom-0 left-0 h-11 w-11 border-b-[3px] border-l-[3px] border-accent" />
              <div aria-hidden="true" className="absolute bottom-0 right-0 h-11 w-11 border-b-[3px] border-r-[3px] border-accent" />
              <div className="absolute bottom-4 left-1/2 w-max -translate-x-1/2 rounded-full border border-dashed border-stitch bg-surface px-4 py-2">
                <p className="font-mono text-xs text-muted">{t.photoCapture.viewfinderHint}</p>
              </div>
            </div>
          )}
        </div>

        {status === "ready" && !hasTapped && (
          <p className="text-center font-mono text-xs text-muted">{t.photoCapture.focusHint}</p>
        )}
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
        <div className="max-h-32 overflow-y-auto border-t border-dashed border-stitch bg-surface px-4 py-2 font-mono text-[10px] text-muted">
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
