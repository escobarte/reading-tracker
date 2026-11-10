import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { listNotePhotosForExport } from "@/lib/db/export";

/** Список подписанных ссылок (1 час) на фото заметок владельца — клиент скачивает их по очереди для ZIP. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const photos = await listNotePhotosForExport();
  return NextResponse.json({ photos }, { headers: { "Cache-Control": "no-store" } });
}
