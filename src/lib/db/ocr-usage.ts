import { createClient } from "@/lib/supabase/server";
import { localDateKey } from "@/lib/time";

/** Сколько раз пользователь уже вызывал распознавание сегодня (Europe/Bucharest). */
export async function getOcrUsageToday(): Promise<number> {
  const supabase = await createClient();
  const day = localDateKey(new Date());
  const { data, error } = await supabase.from("ocr_usage").select("count").eq("day", day).maybeSingle();
  if (error) throw error;
  return data?.count ?? 0;
}

/** Увеличивает счётчик за сегодня на 1. Вызывать только после успешного ответа Claude. */
export async function incrementOcrUsage(): Promise<void> {
  const supabase = await createClient();
  const day = localDateKey(new Date());
  const { data: existing, error: selectError } = await supabase
    .from("ocr_usage")
    .select("count")
    .eq("day", day)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase.from("ocr_usage").update({ count: existing.count + 1 }).eq("day", day);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("ocr_usage").insert({ day, count: 1 });
    if (error) throw error;
  }
}
