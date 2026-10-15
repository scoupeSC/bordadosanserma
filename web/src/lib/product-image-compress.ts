import { MAX_PRODUCT_IMAGE_BYTES } from "@/lib/product-image";

const MAX_EDGE_PX = 2048;
const MIN_QUALITY = 0.5;
const QUALITY_STEP = 0.08;

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

function scaleDimensions(width: number, height: number, maxEdge: number) {
  if (width <= maxEdge && height <= maxEdge) {
    return { width, height };
  }
  const ratio = Math.min(maxEdge / width, maxEdge / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function encodeUnderLimit(
  canvas: HTMLCanvasElement,
  mime: "image/jpeg" | "image/webp"
): Promise<Blob | null> {
  let quality = 0.88;
  while (quality >= MIN_QUALITY) {
    const blob = await canvasToBlob(canvas, mime, quality);
    if (blob && blob.size <= MAX_PRODUCT_IMAGE_BYTES) return blob;
    quality -= QUALITY_STEP;
  }
  return canvasToBlob(canvas, mime, MIN_QUALITY);
}

/**
 * Redimensiona y comprime en el navegador para Supabase (< 5 MB).
 * Salida JPEG o WebP (si el navegador lo soporta en canvas).
 */
export async function prepareProductImageForUpload(
  file: File
): Promise<{ ok: true; file: File; compressed: boolean } | { ok: false; error: string }> {
  if (!file.size) {
    return { ok: false, error: "El archivo está vacío" };
  }

  const isImage =
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i.test(file.name);

  if (!isImage) {
    return { ok: false, error: "Elige un archivo de imagen" };
  }

  if (
    file.size <= MAX_PRODUCT_IMAGE_BYTES &&
    (file.type === "image/jpeg" || file.type === "image/webp" || file.type === "image/png")
  ) {
    return { ok: true, file, compressed: false };
  }

  let img: HTMLImageElement;
  try {
    img = await loadImageElement(file);
  } catch {
    return {
      ok: false,
      error:
        "No pudimos abrir esta imagen en el navegador. Prueba JPG o PNG, o toma la foto de nuevo.",
    };
  }

  const { width, height } = scaleDimensions(img.naturalWidth, img.naturalHeight, MAX_EDGE_PX);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { ok: false, error: "No se pudo procesar la imagen" };
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const preferWebp = canvas.toDataURL("image/webp").startsWith("data:image/webp");

  const mime: "image/jpeg" | "image/webp" = preferWebp ? "image/webp" : "image/jpeg";
  const ext = mime === "image/webp" ? "webp" : "jpg";

  let blob = await encodeUnderLimit(canvas, mime);

  if (blob && blob.size > MAX_PRODUCT_IMAGE_BYTES && mime === "image/webp") {
    blob = await encodeUnderLimit(canvas, "image/jpeg");
  }

  if (!blob) {
    return { ok: false, error: "No se pudo comprimir la imagen" };
  }

  if (blob.size > MAX_PRODUCT_IMAGE_BYTES) {
    const smaller = scaleDimensions(width, height, Math.round(MAX_EDGE_PX * 0.75));
    canvas.width = smaller.width;
    canvas.height = smaller.height;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, smaller.width, smaller.height);
    ctx.drawImage(img, 0, 0, smaller.width, smaller.height);
    blob = (await encodeUnderLimit(canvas, "image/jpeg")) ?? blob;
  }

  if (blob.size > MAX_PRODUCT_IMAGE_BYTES) {
    return {
      ok: false,
      error: "La imagen sigue siendo muy pesada. Prueba con otra foto más pequeña.",
    };
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "producto";
  const out = new File([blob], `${baseName}.${ext}`, { type: mime, lastModified: Date.now() });

  return { ok: true, file: out, compressed: true };
}
