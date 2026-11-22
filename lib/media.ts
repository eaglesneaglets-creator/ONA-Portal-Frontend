/**
 * Where a media-library image lives, for <Image>.
 *
 * The API serves each image at /api/v1/content/media/<id>/ on its public
 * origin. next.config.ts allows exactly that path for the image optimiser,
 * which then serves visitors resized WebP from this site's own origin (so
 * the CSP's img-src 'self' covers it).
 *
 * The optimiser refuses local addresses (Next 16), so against a local API
 * the image is shown as stored instead; production always optimises.
 */

const API = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1");

/** The image's absolute URL on the public API origin. */
export function mediaSrc(path: string): string {
  return new URL(path, API.origin).toString();
}

/** True when the API is on this machine, where the optimiser will not fetch. */
export const MEDIA_UNOPTIMIZED = ["localhost", "127.0.0.1", "[::1]"].includes(API.hostname);

