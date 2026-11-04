"use client";

import { useId, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { PhotoThumbnail } from "./PhotoThumbnail";
import type { NoteType } from "@/lib/db/types";

type NoteCardProps = {
  id: string;
  type: NoteType;
  typeLabel: string;
  body: string | null;
  meaning: string | null;
  /** Предварительно отформатированная подпись («Книга · стр. N», «стр. N» или null — ничего не показываем). */
  caption: string | null;
  isFavorite: boolean;
  favoriteLabel: string;
  tags: string[];
  /** Есть ли у заметки фото (`photo_path` в базе) — не путать с `photoUrl`, который может быть `null`, если подписанная ссылка не получена. */
  hasPhoto: boolean;
  photoUrl: string | null;
  photoNoTextLabel: string;
  photoViewLabel: string;
  onOpen: () => void;
  onToggleFavorite: () => void;
};

export function NoteCard({
  id,
  type,
  typeLabel,
  body,
  meaning,
  caption,
  isFavorite,
  favoriteLabel,
  tags,
  hasPhoto,
  photoUrl,
  photoNoTextLabel,
  photoViewLabel,
  onOpen,
  onToggleFavorite,
}: NoteCardProps) {
  const [photoOpen, setPhotoOpen] = useState(false);
  const titleId = useId();

  return (
    <div className="relative rounded-xl border border-line bg-surface p-3.5 lg:p-4">
      <div className="flex items-start gap-3 pr-11">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <Chip variant={type === "quote" ? "quote" : "default"}>{typeLabel}</Chip>

          {type === "word" ? (
            <>
              <p className="mt-3 font-serif text-2xl font-bold text-text">{body}</p>
              {meaning && <p className="mt-1 font-serif text-base text-muted">{meaning}</p>}
            </>
          ) : body ? (
            <p className="mt-3 font-serif text-lg italic text-text">{body}</p>
          ) : hasPhoto ? (
            <p className="mt-3 font-serif text-base italic text-muted">{photoNoTextLabel}</p>
          ) : null}

          {caption && <p className="mt-3 font-mono text-xs text-muted">{caption}</p>}

          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Chip key={tag}>#{tag}</Chip>
              ))}
            </div>
          )}
        </button>

        {hasPhoto && (
          <button type="button" onClick={() => setPhotoOpen(true)} aria-label={photoViewLabel} className="shrink-0">
            <PhotoThumbnail src={photoUrl} seed={id} alt="" size="card" />
          </button>
        )}
      </div>

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

      {hasPhoto && (
        <Modal open={photoOpen} onClose={() => setPhotoOpen(false)} titleId={titleId} title={photoViewLabel}>
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[320px] overflow-hidden rounded-xl bg-paper">
            <PhotoThumbnail src={photoUrl} seed={id} alt="" size="full" />
          </div>
        </Modal>
      )}
    </div>
  );
}
