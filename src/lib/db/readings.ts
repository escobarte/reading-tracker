import { createClient } from "@/lib/supabase/server";
import type { Reading } from "./types";

export async function getOpenReading(bookId: string): Promise<Reading | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("readings")
    .select("*")
    .eq("book_id", bookId)
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Returns the book's open reading, creating one if it doesn't exist yet. */
export async function ensureOpenReading(bookId: string): Promise<Reading> {
  const existing = await getOpenReading(bookId);
  if (existing) return existing;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("readings")
    .insert({ book_id: bookId, started_at: new Date().toISOString() })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
