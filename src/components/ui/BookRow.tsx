"use client";

import Link from "next/link";
import { useRef, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { Cover } from "./Cover";
import type { Book } from "@/lib/db/types";

const CLICK_MOVE_TOLERANCE = 6;

type BookRowProps = {
  book: Book;
  position?: number;
  isNext?: boolean;
  selected?: boolean;
  nextLabel?: string;
  formatLabel: string;
  dragHandle?: ReactNode;
  onSelect?: (id: string) => void;
  suppressClickRef?: React.RefObject<boolean>;
};

export function BookRow({
  book,
  position,
  isNext,
  selected,
  nextLabel,
  formatLabel,
  dragHandle,
  onSelect,
  suppressClickRef,
}: BookRowProps) {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  function handlePointerDown(event: PointerEvent<HTMLAnchorElement>) {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function handleClickCapture(event: MouseEvent<HTMLAnchorElement>) {
    const start = pointerStartRef.current;
    const moved =
      start !== null &&
      (Math.abs(event.clientX - start.x) > CLICK_MOVE_TOLERANCE ||
        Math.abs(event.clientY - start.y) > CLICK_MOVE_TOLERANCE);
    if (moved || suppressClickRef?.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    if (onSelect && window.matchMedia("(min-width: 1024px)").matches) {
      event.preventDefault();
      onSelect(book.id);
    }
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-[14px] bg-surface py-2.5 pl-3 pr-1.5 ${
        isNext ? "border-[1.5px] border-accent" : selected ? "border-[1.5px] border-accent" : "border border-line"
      }`}
    >
      <Link
        href={`/books/${book.id}`}
        prefetch={false}
        draggable={false}
        onPointerDown={handlePointerDown}
        onClickCapture={handleClickCapture}
        onClick={handleClick}
        aria-current={selected ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        {typeof position === "number" && (
          <span className="w-4 shrink-0 text-center font-mono text-sm text-accent">{position}</span>
        )}
        <Cover title={book.title} coverUrl={book.cover_url ?? undefined} size="row" />
        <div className="min-w-0 flex-1">
          {isNext && nextLabel && (
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-accent">{nextLabel}</p>
          )}
          <p className="truncate font-serif text-[17px] font-bold leading-[1.15] text-text">
            {book.title}
          </p>
          {book.author && <p className="truncate font-serif text-[13px] text-muted">{book.author}</p>}
          <p className="font-mono text-xs text-muted">
            {formatLabel}
            {book.total_pages ? ` · ${book.total_pages}` : ""}
          </p>
        </div>
      </Link>
      {dragHandle}
    </div>
  );
}
