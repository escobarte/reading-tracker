/**
 * Надёжный origin для OAuth redirect_to: из заголовков запроса
 * (Vercel и превью ставят x-forwarded-*), а не из переменной окружения.
 */
export function getRequestOrigin(headers: Headers): string {
  const protocol = headers.get("x-forwarded-proto") ?? "http";
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "";
  return `${protocol}://${host}`;
}
