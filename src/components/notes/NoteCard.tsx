import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import type { NoteType } from "@/lib/db/types";

type NoteCardProps = {
  type: NoteType;
  typeLabel: string;
  body: string | null;
  meaning: string | null;
  /** Предварительно отформатированная подпись («Книга · стр. N», «стр. N» или null — ничего не показываем). */
  caption: string | null;
  isFavorite: boolean;
  favoriteLabel: string;
  tags: string[];
  onOpen: () => void;
  onToggleFavorite: () => void;
};

export function NoteCard({
  type,
  typeLabel,
  body,
  meaning,
  caption,
  isFavorite,
  favoriteLabel,
  tags,
  onOpen,
  onToggleFavorite,
}: NoteCardProps) {
  return (
    <div className="relative rounded-xl border border-line bg-surface p-3.5 lg:p-4">
      <button type="button" onClick={onOpen} className="block w-full pr-11 text-left">
        <Chip variant={type === "quote" ? "quote" : "default"}>{typeLabel}</Chip>

        {type === "word" ? (
          <>
            <p className="mt-3 font-serif text-2xl font-bold text-text">{body}</p>
            {meaning && <p className="mt-1 font-serif text-base text-muted">{meaning}</p>}
          </>
        ) : (
          <p className="mt-3 font-serif text-lg italic text-text">{body}</p>
        )}

        {caption && <p className="mt-3 font-mono text-xs text-muted">{caption}</p>}

        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Chip key={tag}>#{tag}</Chip>
            ))}
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite();
        }}
        aria-label={favoriteLabel}
        aria-pressed={isFavorite}
        className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center text-accent"
      >
        <Icon name="favorite" style={isFavorite ? { fill: "currentColor" } : undefined} />
      </button>
    </div>
  );
}
