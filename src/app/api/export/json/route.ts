import { getCurrentUser } from "@/lib/get-current-user";
import { getFullExportData } from "@/lib/db/export";
import { localDateKey } from "@/lib/time";
import { unauthorized } from "@/lib/unauthorized";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const data = await getFullExportData();
  const filename = `reading-tracker-${localDateKey(new Date())}.json`;

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
