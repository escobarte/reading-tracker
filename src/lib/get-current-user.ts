import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type AuthProvider = "google" | "email";

export type CurrentUser = {
  id: string;
  email: string | null;
  /** Способ входа по `app_metadata.provider` из JWT — для экрана настроек ("вход через Google"/"по паролю"). */
  provider: AuthProvider | null;
};

/** cache(): если за один запрос текущего пользователя спрашивают несколько компонентов, JWT проверяется один раз. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  const claims = data.claims as { sub: string; email?: string; app_metadata?: { provider?: string } };
  const rawProvider = claims.app_metadata?.provider;
  const provider: AuthProvider | null = rawProvider === "google" ? "google" : rawProvider === "email" ? "email" : null;
  return { id: claims.sub, email: claims.email ?? null, provider };
});
