import type { Dictionary } from "@/i18n/types";
import type { BookFormat, BookShelf } from "@/lib/db/types";

export function shelfLabel(shelf: BookShelf, t: Dictionary): string {
  switch (shelf) {
    case "want":
      return t.library.shelfWant;
    case "collection":
      return t.library.shelfCollection;
    case "reading":
      return t.library.shelfReading;
    case "done":
      return t.library.shelfDone;
    case "paused":
      return t.library.shelfPaused;
    case "dropped":
      return t.library.shelfDropped;
  }
}

export function formatLabel(format: BookFormat, t: Dictionary): string {
  return format === "paper" ? t.addbook.formatPaper : t.addbook.formatEbook;
}
