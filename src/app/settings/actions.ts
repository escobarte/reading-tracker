"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { setDailyPagesGoal } from "@/lib/db/goals";

/** Выход с этого устройства: сессия удаляется из базы, cookie — из браузера. */
export async function logout() {
  const requestHeaders = await headers();
  await getAuth().api.signOut({ headers: requestHeaders });
  redirect("/login");
}

export async function setDailyPagesGoalAction(value: number): Promise<number> {
  const clamped = await setDailyPagesGoal(value);
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/session");
  return clamped;
}
