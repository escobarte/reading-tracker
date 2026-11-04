import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { getOcrUsageToday, incrementOcrUsage } from "@/lib/db/ocr-usage";
import { OCR_DAILY_LIMIT, OCR_MAX_UPLOAD_BYTES } from "@/lib/config";
import { OCR_IMAGE_TYPES, OcrUpstreamError, normalizeOcrLanguage, recognizePageText, type OcrImageType } from "@/lib/ocr";

export const runtime = "nodejs";

type OcrRequestBody = {
  image?: string;
  mimeType?: string;
  language?: string;
};

function base64ByteLength(base64: string): number {
  const clean = base64.replace(/=+$/, "");
  return Math.floor((clean.length * 3) / 4);
}

export async function POST(request: NextRequest) {
  // Проверка входа внутри самого маршрута (getClaims), не только в proxy.ts.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: OcrRequestBody;
  try {
    body = (await request.json()) as OcrRequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { image, mimeType } = body;
  if (!image || typeof image !== "string" || !mimeType || !OCR_IMAGE_TYPES.includes(mimeType as OcrImageType)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  if (base64ByteLength(image) > OCR_MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 400 });
  }

  const usedToday = await getOcrUsageToday();
  if (usedToday >= OCR_DAILY_LIMIT) {
    return NextResponse.json({ error: "limit" }, { status: 429 });
  }

  const language = normalizeOcrLanguage(body.language);

  try {
    const text = await recognizePageText(image, mimeType as OcrImageType, language);
    await incrementOcrUsage();
    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof OcrUpstreamError) {
      // Не логируем ключ, заголовки и тело запроса — только тип и усечённое сообщение ошибки Anthropic.
      console.error("[ocr] upstream error:", error.message);
      if (error.kind === "no_credit") {
        return NextResponse.json({ error: "no_credit" }, { status: 402 });
      }
    } else {
      console.error("[ocr] unexpected error");
    }
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
