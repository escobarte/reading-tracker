import { NextResponse, type NextRequest } from "next/server";
import { getAuth, isAllowedEmail } from "@/lib/auth";
import { unauthorized } from "@/lib/unauthorized";

const LOGIN_PATH = "/login";

/** Адреса, которые отдают данные, а не экраны. */
function isDataPath(pathname: string): boolean {
  return pathname.startsWith("/api/") || pathname === "/notes/export";
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

function route(request: NextRequest, isAuthenticated: boolean) {
  const { pathname } = request.nextUrl;

  if (isDataPath(pathname)) {
    if (isAuthenticated) return NextResponse.next();
    // Переход по ссылке в браузере ведёт на экран входа, остальные запросы получают 401.
    const isNavigation = request.headers.get("accept")?.includes("text/html");
    return isNavigation ? redirectTo(request, LOGIN_PATH) : unauthorized();
  }

  // Server Action проверяет вход сама (requireSignedIn) и отправляет на /login через Next.
  // Редирект отсюда браузер выполнить не может: вместо экрана входа он показал бы ошибку.
  if (request.method === "POST" && request.headers.has("next-action")) return NextResponse.next();

  const isLoginPage = pathname === LOGIN_PATH;
  if (isAuthenticated === isLoginPage) return redirectTo(request, isAuthenticated ? "/" : LOGIN_PATH);
  return NextResponse.next();
}

export async function proxy(request: NextRequest) {
  // Настоящая проверка сессии по базе, а не наличия cookie: иначе устаревшая cookie зациклит
  // переходы между / и /login. Заодно раз в день продлевает сессию — год считается от захода.
  const { headers: authHeaders, response: session } = await getAuth().api.getSession({
    headers: request.headers,
    returnHeaders: true,
  });
  const response = route(request, session !== null && isAllowedEmail(session.user.email));

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
