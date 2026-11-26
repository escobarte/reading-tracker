import { NextResponse, type NextRequest } from "next/server";
import { getAuth, isAllowedEmail } from "@/lib/auth";

const LOGIN_PATH = "/login";

export async function proxy(request: NextRequest) {
  // Настоящая проверка сессии по базе, а не наличия cookie: иначе устаревшая cookie зациклит
  // переходы между / и /login. Заодно раз в день продлевает сессию — год считается от захода.
  const { headers: authHeaders, response: session } = await getAuth().api.getSession({
    headers: request.headers,
    returnHeaders: true,
  });
  const isAuthenticated = session !== null && isAllowedEmail(session.user.email);
  const isLoginPage = request.nextUrl.pathname === LOGIN_PATH;

  let response: NextResponse;
  if (isAuthenticated === isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = isAuthenticated ? "/" : LOGIN_PATH;
    response = NextResponse.redirect(url);
  } else {
    response = NextResponse.next();
  }

  // Продлённая или удалённая cookie сессии уходит браузеру с любым ответом.
  for (const cookie of authHeaders.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

export const config = {
  matcher: [
    // api/auth — вход через Better Auth: он нужен как раз тому, кто ещё не вошёл, и защищает себя сам.
    // Иконки приложения нужны и на экране входа.
    "/((?!_next/static|_next/image|favicon.ico|icon\\.svg$|apple-icon\\.png$|sw.js|manifest.webmanifest|icons/|api/auth/).*)",
  ],
};
