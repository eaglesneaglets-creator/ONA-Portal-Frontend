import Image from "next/image";

import { MEDIA_UNOPTIMIZED, mediaSrc } from "@/lib/media";

/** A media-library image in a fixed-shape box, cropped to fill it (admin thumbnails). */
export function MediaThumb({
  src,
  alt = "",
  className = "",
  sizes = "200px",
}: {
  src: string;
  alt?: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <span className={`relative block overflow-hidden rounded-lg bg-surface-alt ${className}`}>
      <Image src={mediaSrc(src)} alt={alt} fill sizes={sizes} unoptimized={MEDIA_UNOPTIMIZED} className="object-cover" />
    </span>
  );
}
