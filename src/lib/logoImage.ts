/** Longest side of a stored logo, in pixels: sharp on the top bar, small enough to keep each load light. */
const MAX_SIDE = 256;
/** What the server accepts (base64 text length); the image is shrunk further until it fits. */
const MAX_CHARS = 300_000;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export const LOGO_ACCEPT = ACCEPTED.join(",");

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    image.src = url;
  });
}

/**
 * Turns an uploaded image into the data URL stored as a client's logo: scaled down to fit a square of
 * MAX_SIDE px, keeping its transparency (PNG). A vector image (SVG) is rasterized here, so the server
 * never stores anything that could carry script.
 */
export async function fileToLogoDataUrl(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error("Usa una imagen PNG, JPG, WebP o SVG");
  if (file.size > MAX_INPUT_BYTES) throw new Error("La imagen pesa más de 8 MB");

  const image = await loadImage(file);
  const width = image.naturalWidth || MAX_SIDE;
  const height = image.naturalHeight || MAX_SIDE;
  if (width === 0 || height === 0) throw new Error("No se pudo leer la imagen");

  for (const side of [MAX_SIDE, 192, 128]) {
    const scale = Math.min(1, side / Math.max(width, height));
    // An SVG with no intrinsic size reports 0 or a tiny one; scale it up so it isn't blurry.
    const factor = file.type === "image/svg+xml" ? side / Math.max(width, height) : scale;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * factor));
    canvas.height = Math.max(1, Math.round(height * factor));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Tu navegador no puede procesar la imagen");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const png = canvas.toDataURL("image/png");
    if (png.length <= MAX_CHARS) return png;
    const webp = canvas.toDataURL("image/webp", 0.85);
    if (webp.startsWith("data:image/webp") && webp.length <= MAX_CHARS) return webp;
  }
  throw new Error("La imagen es demasiado compleja; prueba con una más simple");
}
