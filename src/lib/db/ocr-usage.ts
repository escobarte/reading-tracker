import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { ocrUsage } from "@/db/schema";
import { requireUserId } from "@/lib/require-user";
import { localDateKey } from "@/lib/time";

/** Сколько раз пользователь уже вызывал распознавание сегодня (Europe/Bucharest). */
export async function getOcrUsageToday(): Promise<number> {
  const userId = await requireUserId();
  const day = localDateKey(new Date());
  const [row] = await getDb()
    .select({ count: ocrUsage.count })
    .from(ocrUsage)
    .where(and(eq(ocrUsage.user_id, userId), eq(ocrUsage.day, day)));
  return row?.count ?? 0;
}

/** Увеличивает счётчик за сегодня на 1 одним запросом. Вызывать только после успешного ответа Claude. */
export async function incrementOcrUsage(): Promise<void> {
  const userId = await requireUserId();
  const day = localDateKey(new Date());
  await getDb()
    .insert(ocrUsage)
    .values({ user_id: userId, day, count: 1 })
    .onConflictDoUpdate({
      target: [ocrUsage.user_id, ocrUsage.day],
      set: { count: sql`${ocrUsage.count} + 1` },
    });
}
