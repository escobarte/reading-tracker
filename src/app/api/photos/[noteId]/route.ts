import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { getNotePhotoFile } from "@/lib/db/notes";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function failure(status: 401 | 404, error: string) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Фото заметки, только её владельцу. Путь к файлу берётся из базы, из запроса — лишь id заметки.
 * Чужая, несуществующая и без фото неотличимы: везде 404.
 */
export async function GET(_request: Request, context: RouteContext<"/api/photos/[noteId]">) {
  const user = await getCurrentUser();
  if (!user) return failure(401, "unauthorized");

  const { noteId } = await context.params;
  const photo = UUID.test(noteId) ? await getNotePhotoFile(noteId) : null;
  if (!photo) return failure(404, "not_found");

  return new Response(photo, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(photo.length),
      // Только кэш браузера владельца. Адрес с версией меняется при замене фото.
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
