export type OcrLanguage = "ru" | "en" | "ro";
export type OcrImageType = "image/jpeg" | "image/png" | "image/webp";

export const OCR_IMAGE_TYPES: OcrImageType[] = ["image/jpeg", "image/png", "image/webp"];

const LANGUAGE_NAMES: Record<OcrLanguage, string> = {
  ru: "русский",
  en: "английский",
  ro: "румынский",
};

/** Нормализует произвольную строку языка книги (из Google Books и т.п.) к одному из трёх поддерживаемых. */
export function normalizeOcrLanguage(value: string | null | undefined): OcrLanguage {
  const v = (value ?? "").trim().toLowerCase();
  if (v.startsWith("en")) return "en";
  if (v.startsWith("ro")) return "ro";
  return "ru";
}

export function buildOcrPrompt(language: OcrLanguage): string {
  return (
    `Перепиши точно весь текст на изображении. Язык текста: ${LANGUAGE_NAMES[language]}. ` +
    "Не добавляй комментариев, не переводи, не исправляй. Склей слова, разорванные переносом на конце строки. " +
    "Абзацы раздели пустой строкой. Если текста нет, верни пустую строку."
  );
}

const DEFAULT_MODEL = "claude-haiku-5-5";
const ANTHROPIC_VERSION = "2023-06-01";

export class OcrUpstreamError extends Error {}

/** Вызывает Anthropic Messages API с изображением, возвращает распознанный текст. Ключ читается только здесь, на сервере. */
export async function recognizePageText(
  imageBase64: string,
  mimeType: OcrImageType,
  language: OcrLanguage,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new OcrUpstreamError("missing_api_key");

  const model = process.env.ANTHROPIC_OCR_MODEL || DEFAULT_MODEL;

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
              { type: "text", text: buildOcrPrompt(language) },
            ],
          },
        ],
      }),
    });
  } catch {
    throw new OcrUpstreamError("network");
  }

  if (!response.ok) {
    throw new OcrUpstreamError(`status_${response.status}`);
  }

  type MessagesResponse = { content?: { type: string; text?: string }[] };
  let json: MessagesResponse;
  try {
    json = (await response.json()) as MessagesResponse;
  } catch {
    throw new OcrUpstreamError("parse");
  }

  const text = (json.content ?? []).find((block) => block.type === "text")?.text ?? "";
  return text.trim();
}
