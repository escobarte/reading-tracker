import { NextResponse } from "next/server";

/** Ответ маршрутов с данными тому, кто не вошёл. */
export function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
}
