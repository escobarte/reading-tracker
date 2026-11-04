/** Обработка фото страницы на клиенте: ориентация EXIF, кадрирование, уменьшение, сжатие. Canvas/File API — только браузер. */

export type NormalizedRect = { left: number; top: number; right: number; bottom: number };

/** Декодирует файл с учётом ориентации EXIF (поворот/отражение уже применены к пикселям). */
export async function bitmapFromFile(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function drawToCanvas(bitmap: ImageBitmap, crop: NormalizedRect | null, maxDim: number): HTMLCanvasElement {
  const sx = crop ? crop.left * bitmap.width : 0;
  const sy = crop ? crop.top * bitmap.height : 0;
  const sw = crop ? (crop.right - crop.left) * bitmap.width : bitmap.width;
  const sh = crop ? (crop.bottom - crop.top) * bitmap.height : bitmap.height;

  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unsupported");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode_failed"))), "image/jpeg", quality);
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read_failed"));
    reader.readAsDataURL(blob);
  });
}

export type CompressedImage = { blob: Blob; base64: string; mimeType: "image/jpeg" };

/**
 * Кадрирует (если указан `crop`) и уменьшает до `maxDim` по длинной стороне, сжимает в JPEG с `quality`.
 * Если задан `maxBytes` и результат больше — уменьшает качество и размер ступенями (до 4 попыток).
 */
export async function compressImage(
  bitmap: ImageBitmap,
  crop: NormalizedRect | null,
  options: { maxDim: number; quality: number; maxBytes?: number },
): Promise<CompressedImage> {
  let maxDim = options.maxDim;
  let quality = options.quality;
  const attempts = 4;

  for (let i = 0; i < attempts; i++) {
    const canvas = drawToCanvas(bitmap, crop, maxDim);
    const blob = await canvasToBlob(canvas, quality);
    const withinBudget = !options.maxBytes || blob.size <= options.maxBytes;
    if (withinBudget || i === attempts - 1) {
      const base64 = await blobToBase64(blob);
      return { blob, base64, mimeType: "image/jpeg" };
    }
    quality = Math.max(0.5, quality - 0.1);
    maxDim = Math.round(maxDim * 0.85);
  }
  throw new Error("compress_failed");
}

/** Минимальный размер стороны рамки кадрирования (доля от изображения). */
export const MIN_CROP_SIZE = 0.08;

export function clampCropRect(rect: NormalizedRect): NormalizedRect {
  const left = Math.min(Math.max(0, rect.left), 1 - MIN_CROP_SIZE);
  const top = Math.min(Math.max(0, rect.top), 1 - MIN_CROP_SIZE);
  const right = Math.max(Math.min(1, rect.right), left + MIN_CROP_SIZE);
  const bottom = Math.max(Math.min(1, rect.bottom), top + MIN_CROP_SIZE);
  return { left, top, right, bottom };
}
