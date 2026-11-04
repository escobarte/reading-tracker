"use client";

import Image from "next/image";
import { useState } from "react";

/** Детерминированный поворот ±3° по id заметки — без Math.random, чтобы не ловить рассинхрон SSR/CSR. */
function thumbnailRotation(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 7) - 3;
}

type PhotoThumbnailProps = {
  src: string | null;
  seed: string;
  alt: string;
  /** "card": 56×74 в NoteCard. "result": побольше (96×128), для экрана результата и правки заметки.
   * "full": заполняет родителя (например, `aspect-[3/4]` в Modal просмотра фото). */
  size?: "card" | "result" | "full";
};

export function PhotoThumbnail({ src, seed, alt, size = "card" }: PhotoThumbnailProps) {
  const [broken, setBroken] = useState(false);
  const rotate = size === "card" ? thumbnailRotation(seed) : 0;
  const dims = size === "card" ? { w: 56, h: 74 } : size === "result" ? { w: 96, h: 128 } : null;
  const showImage = Boolean(src) && !broken;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-[6px] bg-paper shadow-[var(--shadow-cover)] ${dims ? "" : "h-full w-full"}`}
      style={dims ? { width: dims.w, height: dims.h, transform: rotate ? `rotate(${rotate}deg)` : undefined } : undefined}
    >
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          unoptimized
          sizes={dims ? `${dims.w}px` : "320px"}
          className="object-cover"
          draggable={false}
          onError={() => setBroken(true)}
        />
      ) : (
        <PhotoPlaceholderLines />
      )}
    </div>
  );
}

function PhotoPlaceholderLines() {
  return (
    <div aria-hidden="true" className="flex h-full w-full flex-col justify-center gap-[5px] px-2">
      {[100, 85, 70, 90, 60].map((w, i) => (
        <span key={i} className="h-[3px] rounded-full bg-stitch/40" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}
