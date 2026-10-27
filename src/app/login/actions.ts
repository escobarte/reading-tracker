"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestOrigin } from "@/lib/request-origin";

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "invalid" };
  }

  redirect("/");
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient();
  const origin = getRequestOrigin(await headers());

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.url) {
    redirect("/login?error=google");
  }

  redirect(data.url);
}
