export type PlanSpineBook = { id: string; read: boolean };

const SPINE_COLORS = ["var(--spine-1)", "var(--spine-2)", "var(--spine-3)", "var(--spine-4)"];

/** Deterministic mixed heights (84–110) so the row doesn't look mechanically uniform. */
const SPINE_HEIGHTS = [84, 96, 110, 90, 102, 86, 108, 94, 100, 88, 106, 92];

export function PlanSpines({ books }: { books: PlanSpineBook[] }) {
  return (
    <div className="flex items-end gap-[3px] overflow-hidden border-b-[1.5px] border-dashed border-stitch pb-2" aria-hidden="true">
      {books.map((book, index) => (
        <span
          key={book.id}
          className="w-4 shrink-0 rounded-t-[2px]"
          style={{
            height: SPINE_HEIGHTS[index % SPINE_HEIGHTS.length],
            background: SPINE_COLORS[index % SPINE_COLORS.length],
            opacity: book.read ? 1 : 0.55,
          }}
        />
      ))}
    </div>
  );
}
