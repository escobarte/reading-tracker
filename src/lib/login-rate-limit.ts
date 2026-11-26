// Ограничение попыток входа по паролю. Встроенный лимит Better Auth на вызовы из Server Action
// не действует. Счётчик в памяти процесса и не зависит от IP: без обратного прокси клиент
// сам задаёт X-Forwarded-For. Перезапуск сервера обнуляет счётчик.
import { isAllowedEmail } from "@/lib/auth";
import { LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MINUTES } from "@/lib/config";

/** Чужие email считаются отдельно, чтобы случайные попытки не закрывали вход владельцу. */
type Bucket = "owner" | "other";
type Attempts = { count: number; startedAt: number };

const WINDOW_MS = LOGIN_WINDOW_MINUTES * 60 * 1000;

// globalThis: счётчик должен быть один на процесс, даже если модуль загрузится дважды.
const globalForLimit = globalThis as typeof globalThis & { readingTrackerLogins?: Map<Bucket, Attempts> };

function store(): Map<Bucket, Attempts> {
  return (globalForLimit.readingTrackerLogins ??= new Map());
}

function bucketFor(email: string): Bucket {
  return isAllowedEmail(email) ? "owner" : "other";
}

/**
 * Занимает попытку до проверки пароля, поэтому параллельные запросы не проходят лимит все сразу.
 * `false` — попытки в этом окне кончились.
 */
export function takeLoginAttempt(email: string): boolean {
  const bucket = bucketFor(email);
  const now = Date.now();
  const attempts = store().get(bucket);

  if (!attempts || now - attempts.startedAt >= WINDOW_MS) {
    store().set(bucket, { count: 1, startedAt: now });
    return true;
  }
  if (attempts.count >= LOGIN_MAX_ATTEMPTS) return false;

  attempts.count += 1;
  return true;
}

/** После удачного входа счётчик начинается заново. */
export function clearLoginAttempts(email: string): void {
  store().delete(bucketFor(email));
}
