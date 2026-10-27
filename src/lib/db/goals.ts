import { createClient } from "@/lib/supabase/server";
import { DEFAULT_DAILY_PAGES_GOAL, DEFAULT_YEAR_BOOKS_GOAL, computeDeadlineNorm, type DeadlineComputation } from "@/lib/goals";
import { localDateKey, localDayRangeUtc } from "@/lib/time";

const DAILY_PAGES_RANGE = { min: 1, max: 500 };
const YEAR_BOOKS_RANGE = { min: 1, max: 200 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export async function getDailyPagesGoal(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .select("target_value")
    .eq("kind", "daily")
    .maybeSingle();
  if (error) throw error;
  return data?.target_value ?? DEFAULT_DAILY_PAGES_GOAL;
}

export async function setDailyPagesGoal(value: number): Promise<number> {
  const clamped = clamp(value, DAILY_PAGES_RANGE.min, DAILY_PAGES_RANGE.max);
  const supabase = await createClient();
  const { data: existing, error: selectError } = await supabase
    .from("goals")
    .select("id")
    .eq("kind", "daily")
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase.from("goals").update({ target_value: clamped }).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("goals").insert({ kind: "daily", target_value: clamped });
    if (error) throw error;
  }
  return clamped;
}

export async function getYearlyBooksGoal(year: number): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .select("target_value")
    .eq("kind", "yearly")
    .eq("year", year)
    .maybeSingle();
  if (error) throw error;
  return data?.target_value ?? DEFAULT_YEAR_BOOKS_GOAL;
}

export async function setYearlyBooksGoal(year: number, value: number): Promise<number> {
  const clamped = clamp(value, YEAR_BOOKS_RANGE.min, YEAR_BOOKS_RANGE.max);
  const supabase = await createClient();
  const { data: existing, error: selectError } = await supabase
    .from("goals")
    .select("id")
    .eq("kind", "yearly")
    .eq("year", year)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase.from("goals").update({ target_value: clamped }).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("goals").insert({ kind: "yearly", year, target_value: clamped });
    if (error) throw error;
  }
  return clamped;
}

export type DeadlineGoal = { dueDate: string; skipWeekdays: number[] };

export async function getDeadlineGoal(readingId: string): Promise<DeadlineGoal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .select("due_date, skip_weekdays")
    .eq("kind", "deadline")
    .eq("reading_id", readingId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.due_date) return null;
  return { dueDate: data.due_date, skipWeekdays: data.skip_weekdays ?? [] };
}

export async function saveDeadlineGoal(readingId: string, dueDate: string, skipWeekdays: number[]): Promise<void> {
  const supabase = await createClient();
  const { data: existing, error: selectError } = await supabase
    .from("goals")
    .select("id")
    .eq("kind", "deadline")
    .eq("reading_id", readingId)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase
      .from("goals")
      .update({ due_date: dueDate, skip_weekdays: skipWeekdays })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("goals")
      .insert({ kind: "deadline", reading_id: readingId, due_date: dueDate, skip_weekdays: skipWeekdays });
    if (error) throw error;
  }
}

export async function deleteDeadlineGoal(readingId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("kind", "deadline").eq("reading_id", readingId);
  if (error) throw error;
}

/** page_to максимум среди сессий прочтения, начатых до начала сегодняшнего дня (локально). */
async function getMaxPageBeforeToday(readingId: string): Promise<number> {
  const supabase = await createClient();
  const { start } = localDayRangeUtc();
  const { data, error } = await supabase
    .from("sessions")
    .select("page_to")
    .eq("reading_id", readingId)
    .lt("started_at", start.toISOString())
    .order("page_to", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.page_to ?? 0;
}

async function getPagesReadToday(readingId: string): Promise<number> {
  const supabase = await createClient();
  const { start, end } = localDayRangeUtc();
  const { data, error } = await supabase
    .from("sessions")
    .select("pages_read")
    .eq("reading_id", readingId)
    .gte("started_at", start.toISOString())
    .lt("started_at", end.toISOString());
  if (error) throw error;
  return (data ?? []).reduce((sum, s) => sum + (s.pages_read ?? 0), 0);
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
