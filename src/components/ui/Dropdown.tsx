"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export type DropdownItem = {
  label: string;
  onSelect: () => void;
  active?: boolean;
};

type DropdownProps = {
  trigger: ReactNode;
  triggerLabel?: string;
  items: DropdownItem[];
  align?: "left" | "right";
  showChevron?: boolean;
  triggerClassName?: string;
};

const defaultTriggerClass =
  "inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-lg border-[1.5px] border-dashed border-stitch bg-surface px-3 font-mono text-xs text-muted";

export function Dropdown({
  trigger,
  triggerLabel,
  items,
  align = "left",
  showChevron = true,
  triggerClassName,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={triggerLabel}
        onClick={() => setOpen((value) => !value)}
        className={triggerClassName ?? defaultTriggerClass}
      >
        {trigger}
        {showChevron && <Icon name="chevron-down" width={16} height={16} />}
      </button>
      {open && (
        <ul
          role="listbox"
          className={`absolute z-10 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-[var(--shadow-cover)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                role="option"
                aria-selected={item.active}
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                }}
                className={`flex min-h-11 w-full items-center px-3 py-2.5 text-left font-serif text-sm transition-colors hover:bg-surface-2 ${
                  item.active ? "font-bold text-accent" : "text-text"
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
