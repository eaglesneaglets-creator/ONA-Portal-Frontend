"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi, type AdminMedia } from "@/lib/api/admin";
import { apiMessage } from "@/components/admin/website/api-message";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_MB = 15;

/**
 * Upload one image to the media library, with what it shows (alt text).
 * The API re-encodes it to WebP and drops the photo's location data, so a
 * phone photo can be uploaded as it is.
 */
export function MediaUpload({ onUploaded, compact = false }: { onUploaded: (m: AdminMedia) => void; compact?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function choose(f: File | null) {
    setError(null);
    if (f && f.size > MAX_MB * 1024 * 1024) {
      setError(`That image is larger than ${MAX_MB} MB. Choose a smaller one.`);
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const m = await adminApi.uploadMedia(file, alt.trim());
      if (m.is_small) {
        toast.warning(`Uploaded, but at ${m.width}×${m.height} it may look soft. Use a larger original, or Enhance it in the Media library.`);
      } else {
        toast.success("Image uploaded.");
      }
      setFile(null);
      setAlt("");
      if (fileRef.current) fileRef.current.value = "";
      onUploaded(m);
    } catch (err) {
      setError(apiMessage(err, "The upload failed. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`grid gap-3 rounded-xl border border-dashed border-border-default bg-surface-alt p-4 ${compact ? "" : "sm:p-5"}`}>
      <div className="grid gap-1.5">
        <Label htmlFor="media-file">Image (JPEG, PNG or WebP, up to {MAX_MB} MB)</Label>
        <Input
          id="media-file"
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
          className="h-auto py-2"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="media-alt">What the picture shows</Label>
        <Input
          id="media-alt"
          value={alt}
          maxLength={200}
          placeholder="e.g. The live room with a drum kit and two vocal booths"
          onChange={(e) => setAlt(e.target.value)}
          className="h-11 md:h-9"
        />
        <p className="text-[12.5px] text-ink-mute">Read aloud by screen readers and used by Google. Skip it for a purely decorative photo.</p>
      </div>
      {error ? <p role="alert" className="text-[13px] text-err">{error}</p> : null}
      <div>
        <Button type="button" className="h-11 md:h-9" disabled={!file || busy} onClick={() => void upload()}>
          <ImagePlus aria-hidden="true" />
          {busy ? "Uploading…" : "Upload image"}
        </Button>
      </div>
    </div>
  );
}
