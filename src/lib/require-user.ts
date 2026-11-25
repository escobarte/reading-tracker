import { getCurrentUser } from "@/lib/get-current-user";

/**
 * id вошедшего пользователя для слоя данных. RLS в собственном PostgreSQL нет,
 * поэтому каждый запрос фильтрует по этому id сам. Без входа бросает ошибку.
 */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}
