"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, isGoogleEnabled } from "@/lib/auth";
import { clearLoginAttempts, takeLoginAttempt } from "@/lib/login-rate-limit";

export type LoginState = { error?: "invalid" | "limit" } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!takeLoginAttempt(email)) {
    return { error: "limit" };
  }

  const requestHeaders = await headers();
  try {
    await getAuth().api.signInEmail({ body: { email, password }, headers: requestHeaders });
  } catch (error) {
    // Отказ во входе — 4xx. Сбой базы или настройки показывается как ошибка, а не как неверный пароль.
    if (error instanceof APIError && error.statusCode < 500) {
      return { error: "invalid" };
    }
    throw error;
  }

  clearLoginAttempts(email);
  redirect("/");
}

export async function signInWithGoogle(): Promise<void> {
  if (!isGoogleEnabled()) {
    redirect("/login");
  }

  const requestHeaders = await headers();
  // Ответ Google принимает /api/auth/callback/google; отказ возвращается на /login?error=…
  const { url } = await getAuth().api.signInSocial({
    body: { provider: "google", callbackURL: "/", errorCallbackURL: "/login", disableRedirect: true },
    headers: requestHeaders,
  });

  if (!url) {
    redirect("/login?error=google");
  }

  redirect(url);
}
