import { and, eq, gte, lt, sql } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { goals, sessions } from "@/db/schema";
import { DEFAULT_DAILY_PAGES_GOAL, computeDeadlineNorm, type DeadlineComputation } from "@/lib/goals";
import { requireUserId } from "@/lib/require-user";
import { localDateKey, localDayRangeUtc } from "@/lib/time";
import { assertOwnReading } from "./query";

const DAILY_PAGES_RANGE = { min: 1, max: 500 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Своя дневная цель. */
function ownDailyGoal(userId: string) {
  return and(eq(goals.user_id, userId), eq(goals.kind, "daily"));
}

/** Свой дедлайн прочтения. */
function ownDeadlineGoal(userId: string, readingId: string) {
  return and(eq(goals.user_id, userId), eq(goals.kind, "deadline"), eq(goals.reading_id, readingId));
}

/** cache(): несколько компонентов одного запроса (layout, Sidebar, сама страница) читают дневную цель один раз. */
export const getDailyPagesGoal = cache(async (): Promise<number> => {
  const userId = await requireUserId();
  const [goal] = await getDb()
    .select({ target_value: goals.target_value })
    .from(goals)
    .where(ownDailyGoal(userId));
  return goal?.target_value ?? DEFAULT_DAILY_PAGES_GOAL;
});

export async function setDailyPagesGoal(value: number): Promise<number> {
  const clamped = clamp(value, DAILY_PAGES_RANGE.min, DAILY_PAGES_RANGE.max);
  const userId = await requireUserId();
  // Условие targetWhere повторяет частичный индекс goals_one_daily_per_user.
  await getDb()
    .insert(goals)
    .values({ user_id: userId, kind: "daily", target_value: clamped })
    .onConflictDoUpdate({
      target: goals.user_id,
      targetWhere: sql`kind = 'daily'`,
      set: { target_value: clamped },
    });
  return clamped;
}

export type DeadlineGoal = { dueDate: string; skipWeekdays: number[] };

export async function getDeadlineGoal(readingId: string): Promise<DeadlineGoal | null> {
  const userId = await requireUserId();
  const [goal] = await getDb()
    .select({ due_date: goals.due_date, skip_weekdays: goals.skip_weekdays })
    .from(goals)
    .where(ownDeadlineGoal(userId, readingId));
  if (!goal?.due_date) return null;
  return { dueDate: goal.due_date, skipWeekdays: goal.skip_weekdays };
}

export async function saveDeadlineGoal(readingId: string, dueDate: string, skipWeekdays: number[]): Promise<void> {
  const userId = await requireUserId();
  const db = getDb();
  await assertOwnReading(db, userId, readingId);
  const values = { due_date: dueDate, skip_weekdays: skipWeekdays };
  // Условие targetWhere повторяет частичный индекс goals_one_deadline_per_reading.
  await db
    .insert(goals)
    .values({ user_id: userId, kind: "deadline", reading_id: readingId, ...values })
    .onConflictDoUpdate({
      target: [goals.user_id, goals.reading_id],
      targetWhere: sql`kind = 'deadline'`,
      set: values,
    });
}

export async function deleteDeadlineGoal(readingId: string): Promise<void> {
  const userId = await requireUserId();
  await getDb().delete(goals).where(ownDeadlineGoal(userId, readingId));
}

/** page_to максимум среди сессий прочтения, начатых до начала сегодняшнего дня (локально). */
async function getMaxPageBeforeToday(readingId: string): Promise<number> {
  const userId = await requireUserId();
  const { start } = localDayRangeUtc();
  const [session] = await getDb()
    .select({ page_to: sessions.page_to })
    .from(sessions)
    .where(
      and(
        eq(sessions.user_id, userId),
        eq(sessions.reading_id, readingId),
        lt(sessions.started_at, start.toISOString()),
      ),
    )
    .orderBy(sql`${sessions.page_to} desc nulls last`)
    .limit(1);
  return session?.page_to ?? 0;
}

async function getPagesReadToday(readingId: string): Promise<number> {
  const userId = await requireUserId();
  const { start, end } = localDayRangeUtc();
  const rows = await getDb()
    .select({ pages_read: sessions.pages_read })
    .from(sessions)
    .where(
      and(
        eq(sessions.user_id, userId),
        eq(sessions.reading_id, readingId),
        gte(sessions.started_at, start.toISOString()),
        lt(sessions.started_at, end.toISOString()),
      ),
    );
  return rows.reduce((sum, s) => sum + (s.pages_read ?? 0), 0);
}

export type DeadlineCardData = DeadlineComputation & DeadlineGoal;

/** Полный расчёт дедлайна для карточки (главная, страница книги), или `null`, если дедлайн не задан. */
export async function getDeadlineForReading(readingId: string, totalPages: number): Promise<DeadlineCardData | null> {
  const deadline = await getDeadlineGoal(readingId);
  if (!deadline) return null;

  const [maxPageBeforeToday, pagesReadToday] = await Promise.all([
    getMaxPageBeforeToday(readingId),
    getPagesReadToday(readingId),
  ]);

  const computation = computeDeadlineNorm({
    todayKey: localDateKey(new Date()),
    dueDateKey: deadline.dueDate,
    skipWeekdays: deadline.skipWeekdays,
    remainingPages: totalPages - maxPageBeforeToday,
    pagesReadToday,
  });

  return { ...computation, ...deadline };
}
