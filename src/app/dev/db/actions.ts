"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createTestBook(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const supabase = await createClient();
  await supabase.from("books").insert({ title });
  revalidatePath("/dev/db");
}

export async function deleteTestBook(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("books").delete().eq("id", id);
  revalidatePath("/dev/db");
}
