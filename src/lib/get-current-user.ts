import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getAuth, isAllowedEmail, LOGIN_METHOD_COOKIE } from "@/lib/auth";

export type AuthProvider = "google" | "email";

export type CurrentUser = {
  id: string;
  email: string | null;
  /** Способ последнего входа — для экрана настроек ("вход через Google"/"по паролю"). */
  provider: AuthProvider;
};

/** cache(): если за один запрос текущего пользователя спрашивают несколько компонентов, сессия проверяется один раз. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const requestHeaders = await headers();

  // disableRefresh: сессию продлевает только proxy — серверные компоненты не могут записать cookie.
  const result = await getAuth().api.getSession({ headers: requestHeaders, query: { disableRefresh: true } });

  if (!result || !isAllowedEmail(result.user.email)) {
    return null;
  }

  const method = (await cookies()).get(LOGIN_METHOD_COOKIE)?.value;
  const provider: AuthProvider = method === "google" ? "google" : "email";
  return { id: result.user.id, email: result.user.email, provider };
});
