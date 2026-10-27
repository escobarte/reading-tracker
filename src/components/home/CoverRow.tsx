import Link from "next/link";
import { Cover } from "@/components/ui/Cover";

export type CoverRowItem = {
  id: string;
  title: string;
  author?: string | null;
  coverUrl?: string | null;
  badge?: number;
};

type CoverRowProps = {
  items: CoverRowItem[];
  hrefFor: (id: string) => string;
  badgeLabel?: (badge: number) => string;
};

export function CoverRow({ items, hrefFor, badgeLabel }: CoverRowProps) {
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
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
        </Link>
      ))}
    </div>
  );
}
