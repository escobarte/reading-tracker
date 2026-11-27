import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { listNotePhotosForExport } from "@/lib/db/export";
import { unauthorized } from "@/lib/unauthorized";

/** Список адресов фото заметок владельца — клиент скачивает их по очереди для ZIP. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const photos = await listNotePhotosForExport();
  return NextResponse.json({ photos }, { headers: { "Cache-Control": "no-store" } });
}
