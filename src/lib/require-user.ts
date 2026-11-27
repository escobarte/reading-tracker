import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/get-current-user";

/**
 * id вошедшего пользователя для слоя данных. RLS в собственном PostgreSQL нет,
 * поэтому каждый запрос фильтрует по этому id сам. Без входа бросает ошибку.
 */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

/**
 * Первая строка каждой Server Action: действие — это отдельный адрес, и proxy его не защищает.
 * Без входа отправляет на /login. Вызывать вне try: `redirect()` прерывает выполнение исключением.
 */
export async function requireSignedIn(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
