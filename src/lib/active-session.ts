const STORAGE_KEY = "reading-tracker:active-session";

export type ActiveSession = {
  bookId: string;
  readingId: string;
  startedAt: string;
  startPage: number;
  pausedAt: string | null;
  pausedTotalMs: number;
};

export function readActiveSession(): ActiveSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveSession>;
    if (
      typeof parsed.bookId !== "string" ||
      typeof parsed.readingId !== "string" ||
      typeof parsed.startedAt !== "string" ||
      typeof parsed.startPage !== "number" ||
      typeof parsed.pausedTotalMs !== "number"
    ) {
      return null;
    }
    return {
      bookId: parsed.bookId,
      readingId: parsed.readingId,
      startedAt: parsed.startedAt,
      startPage: parsed.startPage,
      pausedAt: typeof parsed.pausedAt === "string" ? parsed.pausedAt : null,
      pausedTotalMs: parsed.pausedTotalMs,
    };
  } catch {
    return null;
  }
}

export function writeActiveSession(session: ActiveSession): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // localStorage недоступен (приватный режим и т.п.) — таймер продолжит идти в памяти вкладки.
  }
}

export function clearActiveSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Прошедшее время сессии в секундах на момент `now`. */
export function elapsedSeconds(session: ActiveSession, now: number = Date.now()): number {
  const startedAt = new Date(session.startedAt).getTime();
  const end = session.pausedAt ? new Date(session.pausedAt).getTime() : now;
  const ms = end - startedAt - session.pausedTotalMs;
  return Math.max(0, Math.floor(ms / 1000));
}
