const MAX_BYTES = 5 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function productImageStoragePath(productId: string, mime: string) {
  const ext = MIME_EXT[mime] ?? "jpg";
  return `${productId}/cover.${ext}`;
}

export function validateProductImageFile(file: File): { ok: true } | { ok: false; error: string } {
  if (!file.size) {
    return { ok: false, error: "El archivo está vacío" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "La imagen debe pesar menos de 5 MB" };
  }
  const mime = file.type.toLowerCase();
  if (!MIME_EXT[mime]) {
    return { ok: false, error: "Formato no válido. Usa JPG, PNG, WebP o GIF." };
  }
  return { ok: true };
}

export function storagePathFromPublicUrl(
  publicUrl: string,
  supabaseUrl: string
): string | null {
  const base = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/product-images/`;
  if (!publicUrl.startsWith(base)) return null;
  return publicUrl.slice(base.length);
}
