const PREFIX = "reading-tracker:finish-draft:";

export type FinishDraft = {
  rating: number | null;
  review: string;
  takeaway: string;
};

/** Не даёт потерять введённый текст на экране «Книга прочитана» при случайном переходе — черновик живёт, пока открыта вкладка. */
export function readFinishDraft(readingId: string): FinishDraft | null {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + readingId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FinishDraft>;
    if (typeof parsed.review !== "string" || typeof parsed.takeaway !== "string") return null;
    return {
      rating: typeof parsed.rating === "number" ? parsed.rating : null,
      review: parsed.review,
      takeaway: parsed.takeaway,
    };
  } catch {
    return null;
  }
}

export function writeFinishDraft(readingId: string, draft: FinishDraft): void {
  try {
    window.sessionStorage.setItem(PREFIX + readingId, JSON.stringify(draft));
  } catch {
    // sessionStorage недоступен (приватный режим и т.п.) — черновик просто не переживёт переход.
  }
}

export function clearFinishDraft(readingId: string): void {
  try {
    window.sessionStorage.removeItem(PREFIX + readingId);
  } catch {
    // ignore
  }
}
