"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Book } from "@/lib/db/types";
import { BookRow } from "./BookRow";
import { Icon } from "./Icon";

type SortableBookRowProps = {
  book: Book;
  position: number;
  isNext: boolean;
  nextLabel: string;
  formatLabel: string;
  dragLabel: string;
  selected?: boolean;
  onSelect?: (id: string) => void;
  suppressClickRef?: React.RefObject<boolean>;
};

export function SortableBookRow({
  book,
  position,
  isNext,
  nextLabel,
  formatLabel,
  dragLabel,
  selected,
  onSelect,
  suppressClickRef,
}: SortableBookRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: book.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="mb-2 lg:mb-0"
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
    >
      <BookRow
        book={book}
        position={position}
        isNext={isNext}
        selected={selected}
        nextLabel={nextLabel}
        formatLabel={formatLabel}
        onSelect={onSelect}
        suppressClickRef={suppressClickRef}
        dragHandle={
          <button
            type="button"
            aria-label={`${dragLabel} «${book.title}»`}
            className="flex h-14 w-11 shrink-0 items-center justify-center text-muted touch-none"
            {...attributes}
            {...listeners}
            draggable={false}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <Icon name="drag" />
          </button>
        }
      />
    </div>
  );
}
