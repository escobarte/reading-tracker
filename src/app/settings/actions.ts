"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setDailyPagesGoal } from "@/lib/db/goals";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setDailyPagesGoalAction(value: number): Promise<number> {
  const clamped = await setDailyPagesGoal(value);
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/session");
  return clamped;
}
