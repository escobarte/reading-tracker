"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { MIN_CROP_SIZE, type NormalizedRect } from "@/lib/image";

type HandleKey = "topLeft" | "topMid" | "topRight" | "bottomLeft" | "bottomMid" | "bottomRight";

const HANDLES: HandleKey[] = ["topLeft", "topMid", "topRight", "bottomLeft", "bottomMid", "bottomRight"];

function applyDelta(start: NormalizedRect, key: HandleKey, dx: number, dy: number): NormalizedRect {
  let { left, top, right, bottom } = start;
  if (key === "topLeft" || key === "bottomLeft") left += dx;
  if (key === "topRight" || key === "bottomRight") right += dx;
  if (key === "topLeft" || key === "topMid" || key === "topRight") top += dy;
  if (key === "bottomLeft" || key === "bottomMid" || key === "bottomRight") bottom += dy;

  left = Math.min(Math.max(0, left), right - MIN_CROP_SIZE);
  right = Math.max(Math.min(1, right), left + MIN_CROP_SIZE);
  top = Math.min(Math.max(0, top), bottom - MIN_CROP_SIZE);
  bottom = Math.max(Math.min(1, bottom), top + MIN_CROP_SIZE);
  return { left, top, right, bottom };
}

type RenderedImageRect = { left: number; top: number; width: number; height: number };

function computeRenderedRect(containerW: number, containerH: number, naturalW: number, naturalH: number): RenderedImageRect {
  if (containerW <= 0 || containerH <= 0 || naturalW <= 0 || naturalH <= 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  const scale = Math.min(containerW / naturalW, containerH / naturalH);
  const width = naturalW * scale;
  const height = naturalH * scale;
  return { left: (containerW - width) / 2, top: (containerH - height) / 2, width, height };
}

type CropFrameProps = {
  imageSrc: string;
  naturalWidth: number;
  naturalHeight: number;
  rect: NormalizedRect;
  onChange: (rect: NormalizedRect) => void;
  handleLabels: Record<HandleKey, string>;
};

export function CropFrame({ imageSrc, naturalWidth, naturalHeight, rect, onChange, handleLabels }: CropFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const dragState = useRef<{ key: HandleKey; startX: number; startY: number; startRect: NormalizedRect } | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const rendered = computeRenderedRect(size.w, size.h, naturalWidth, naturalHeight);

  function handlePointerDown(key: HandleKey) {
    return (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragState.current = { key, startX: event.clientX, startY: event.clientY, startRect: rect };
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragState.current;
    if (!drag || rendered.width === 0 || rendered.height === 0) return;
    const dx = (event.clientX - drag.startX) / rendered.width;
    const dy = (event.clientY - drag.startY) / rendered.height;
    onChange(applyDelta(drag.startRect, drag.key, dx, dy));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragState.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      dragState.current = null;
    }
  }

  const cropPx = {
    left: rendered.left + rect.left * rendered.width,
    top: rendered.top + rect.top * rendered.height,
    right: rendered.left + rect.right * rendered.width,
    bottom: rendered.top + rect.bottom * rendered.height,
  };

  const handlePositions: Record<HandleKey, { x: number; y: number }> = {
    topLeft: { x: cropPx.left, y: cropPx.top },
    topMid: { x: (cropPx.left + cropPx.right) / 2, y: cropPx.top },
    topRight: { x: cropPx.right, y: cropPx.top },
    bottomLeft: { x: cropPx.left, y: cropPx.bottom },
    bottomMid: { x: (cropPx.left + cropPx.right) / 2, y: cropPx.bottom },
    bottomRight: { x: cropPx.right, y: cropPx.bottom },
  };

  return (
    <div ref={containerRef} className="relative h-full w-full select-none overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- локальный data URL, next/image тут не нужен */}
      <img src={imageSrc} alt="" className="absolute inset-0 h-full w-full object-contain" draggable={false} />

      {rendered.width > 0 && (
        <>
          {/* Затемнение вне рамки — четыре полосы вокруг кадра. */}
          <div aria-hidden="true" className="absolute bg-text/62" style={{ left: 0, top: 0, right: 0, height: cropPx.top }} />
          <div
            aria-hidden="true"
            className="absolute bg-text/62"
            style={{ left: 0, top: cropPx.bottom, right: 0, bottom: 0 }}
          />
          <div
            aria-hidden="true"
            className="absolute bg-text/62"
            style={{ left: 0, top: cropPx.top, width: cropPx.left, height: cropPx.bottom - cropPx.top }}
          />
          <div
            aria-hidden="true"
            className="absolute bg-text/62"
            style={{ left: cropPx.right, top: cropPx.top, right: 0, height: cropPx.bottom - cropPx.top }}
          />

          <div
            aria-hidden="true"
            className="absolute border-2 border-dashed border-accent"
            style={{
              left: cropPx.left,
              top: cropPx.top,
              width: cropPx.right - cropPx.left,
              height: cropPx.bottom - cropPx.top,
            }}
          />

          {HANDLES.map((key) => {
            const pos = handlePositions[key];
            return (
              <button
                key={key}
                type="button"
                aria-label={handleLabels[key]}
                onPointerDown={handlePointerDown(key)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="absolute flex h-11 w-11 items-center justify-center rounded-full"
                style={{ left: pos.x - 22, top: pos.y - 22, touchAction: "none" }}
              >
                <span aria-hidden="true" className="h-5 w-5 rounded-full border-[3px] border-text bg-accent" />
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}

export type { NormalizedRect };
