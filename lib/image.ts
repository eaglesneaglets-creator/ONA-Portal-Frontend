/**
 * Make a phone photo small enough to upload quickly.
 *
 * A modern phone photo is 3–8 MB and 4000+ px wide. An ID card needs far
 * less to be readable, and on mobile data in Ghana every megabyte is felt.
 * Photos over ~1.5 MB are redrawn at most 2400 px on the long side as JPEG.
 * Anything that is not a photo (a PDF scan), or a browser that cannot
 * redraw, is sent as it is — the server still checks every byte.
 *
 * createImageBitmap applies the photo's EXIF rotation, so a sideways phone
 * photo comes out upright.
 */

const SHRINK_ABOVE_BYTES = 1.5 * 1024 * 1024;

export async function shrinkPhoto(
  file: File,
  maxSide = 2400,
  quality = 0.88,
): Promise<{ blob: Blob; name: string }> {
  const original = { blob: file as Blob, name: file.name };
  if (!file.type.startsWith("image/") || file.size < SHRINK_ABOVE_BYTES) return original;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return original;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return original;
    return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".jpg" };
  } catch {
    return original;
  }
}
