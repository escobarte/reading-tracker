import Link from "next/link";
import { Cover } from "@/components/ui/Cover";
import { Icon } from "@/components/ui/Icon";

export type CoverRowItem = {
  id: string;
  title: string;
  author?: string | null;
  coverUrl?: string | null;
  badge?: number;
  rating?: number | null;
};

type CoverRowProps = {
  items: CoverRowItem[];
  hrefFor: (id: string) => string;
  badgeLabel?: (badge: number) => string;
  ratingLabel?: (rating: number) => string;
};

export function CoverRow({ items, hrefFor, badgeLabel, ratingLabel }: CoverRowProps) {
  return (
    <div className="-mx-1.5 -mt-1.5 flex gap-3 overflow-x-auto px-1.5 pb-6 pt-1.5">
      {items.map((item) => (
        <Link key={item.id} href={hrefFor(item.id)} className="flex w-[100px] shrink-0 flex-col gap-1.5">
          <div className="relative">
            <Cover title={item.title} coverUrl={item.coverUrl ?? undefined} size="queue" />
            {item.badge !== undefined && (
              <span
                aria-label={badgeLabel?.(item.badge)}
                className="absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent font-mono text-xs text-accent-on"
              >
                {item.badge}
              </span>
            )}
          </div>
          <p className="truncate font-serif text-sm font-bold text-text">{item.title}</p>
          {item.author && <p className="truncate font-mono text-xs text-muted">{item.author}</p>}
          {item.rating != null && (
            <p
              className="flex items-center gap-1 font-mono text-xs text-accent"
              aria-label={ratingLabel?.(item.rating)}
            >
              <Icon name="favorite" width={12} height={12} className="shrink-0" style={{ fill: "currentColor" }} />
              {item.rating}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}
