import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { searchBooks } from "@/lib/google-books";
import { unauthorized } from "@/lib/unauthorized";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchBooks(query);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: "search_failed" });
  }
}
