"use client";

import Image from "next/image";
import { useState } from "react";

export type CoverSize = "hero" | "book" | "queue" | "row" | "search" | "session";

type CoverProps = {
  title: string;
  coverUrl?: string;
  size?: CoverSize;
};

const PALETTE = [
  "var(--cover-1)",
  "var(--cover-2)",
  "var(--cover-3)",
  "var(--cover-4)",
  "var(--cover-5)",
  "var(--cover-6)",
  "var(--cover-7)",
];

const dimensions: Record<CoverSize, { w: number; h: number; radius: string; font: number }> = {
  hero: { w: 120, h: 170, radius: "rounded-bl-[5px] rounded-tl-[5px] rounded-br-[8px] rounded-tr-[8px]", font: 17 },
  book: { w: 150, h: 220, radius: "rounded-bl-[5px] rounded-tl-[5px] rounded-br-[10px] rounded-tr-[10px]", font: 20 },
  queue: { w: 100, h: 146, radius: "rounded-bl-[4px] rounded-tl-[4px] rounded-br-[7px] rounded-tr-[7px]", font: 16 },
  row: { w: 56, h: 82, radius: "rounded-bl-[3px] rounded-tl-[3px] rounded-br-[6px] rounded-tr-[6px]", font: 14 },
  search: { w: 44, h: 64, radius: "rounded-bl-[3px] rounded-tl-[3px] rounded-br-[6px] rounded-tr-[6px]", font: 14 },
  session: { w: 72, h: 104, radius: "rounded-bl-[4px] rounded-tl-[4px] rounded-br-[7px] rounded-tr-[7px]", font: 14 },
};

function hashColor(title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function Cover({ title, coverUrl, size = "row" }: CoverProps) {
  const { w, h, radius, font } = dimensions[size];
  const [broken, setBroken] = useState(false);
  const [lastCoverUrl, setLastCoverUrl] = useState(coverUrl);

  if (coverUrl !== lastCoverUrl) {
    setLastCoverUrl(coverUrl);
    setBroken(false);
  }

  if (coverUrl && !broken) {
    return (
      <div
        className={`relative overflow-hidden ${radius} shadow-[var(--shadow-cover)]`}
        style={{ width: w, height: h }}
      >
        <Image
          src={coverUrl}
          alt=""
          fill
          sizes={`${w}px`}
          className="object-cover"
          onError={() => setBroken(true)}
        />
      </div>
    );
  }

  const bg = hashColor(title);

  return (
    <div
      role="img"
      aria-label={title}
      className={`relative flex items-end overflow-hidden ${radius} shadow-[var(--shadow-cover)]`}
      style={{ width: w, height: h, background: bg }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-2"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(0,0,0,.4) 0 5px, rgba(255,255,255,.07) 5px 7px, transparent 7px)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute bottom-6 left-2 right-2 border-b border-dashed"
        style={{ borderColor: "rgba(241,230,209,.45)" }}
      />
      <span
        className="relative p-2 font-serif font-bold leading-tight"
        style={{ color: "var(--cover-text)", fontSize: font }}
      >
        {title}
      </span>
    </div>
  );
}
