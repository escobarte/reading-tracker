/** Для запросов из браузера: ответ 401 значит, что вход уже закрыт, — полный переход на экран входа. */
export function leaveIfSignedOut(response: Response): boolean {
  if (response.status !== 401) return false;
  // Полная загрузка, а не router.push: кэш экранов закрытого входа должен пропасть.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/login");
  return true;
}
