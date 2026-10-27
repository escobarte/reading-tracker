import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequestOrigin } from "@/lib/request-origin";

function safeNextPath(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/";
}

export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request.headers);
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error") ?? searchParams.get("error_description");
  const next = safeNextPath(searchParams.get("next"));

  if (oauthError || !code) {
    return NextResponse.redirect(`${origin}/login?error=google`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=google`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
