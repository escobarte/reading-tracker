"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title?: string;
  /** Заменяет заголовок по умолчанию произвольной разметкой (например, своей шапкой с крестиком). */
  header?: ReactNode;
  /** "sheet": нижний лист на телефоне (до 1023 px), центрированное окно 540 на ПК. По умолчанию — центрированное окно 400. */
  variant?: "center" | "sheet";
  children: ReactNode;
};

export function Modal({ open, onClose, titleId, title, header, variant = "center", children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function focusables(): HTMLElement[] {
      const node = dialogRef.current;
      if (!node) return [];
      return Array.from(
        node.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      );
    }

    focusables()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = focusables();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  if (variant === "sheet") {
    return (
      <div
        className="fixed inset-0 z-30 flex items-end justify-center bg-text/55 lg:items-center lg:px-5"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[24px] border-t border-line bg-surface px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5 lg:max-h-[90dvh] lg:w-[540px] lg:rounded-xl lg:border lg:p-7 lg:shadow-[var(--shadow-hero)]"
        >
          <div aria-hidden="true" className="mx-auto mb-4 h-[5px] w-11 rounded-full bg-stitch lg:hidden" />
          {header ?? (
            <h2 id={titleId} className="mb-4 font-serif text-xl font-bold text-text">
              {title}
            </h2>
          )}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-text/55 px-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[400px] rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-hero)]"
      >
        {header ?? (
          <h2 id={titleId} className="mb-4 font-serif text-xl font-bold text-text">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
