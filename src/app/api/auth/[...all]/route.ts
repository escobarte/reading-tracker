import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";

/** Все адреса Better Auth: вход, выход, сессия, ответ Google. */
function handle(request: Request) {
  return getAuth().handler(request);
}

export { handle as GET, handle as POST };
