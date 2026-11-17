"use client";

import { Camera, CheckCircle2, FileText, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";
import { kycApi, type DocumentKind, type MyIdentity } from "@/lib/api/kyc";
import { shrinkPhoto } from "@/lib/image";
import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/*
 * Uploads go one at a time. Each answer is the whole check as it stands, so
 * if two overlapped, the older answer could land last and make a photo that
 * did upload look missing. One at a time, the last answer is always the
 * newest — and on mobile data, two photos racing each other is no faster.
 */
let uploadQueue: Promise<unknown> = Promise.resolve();
function queued<T>(task: () => Promise<T>): Promise<T> {
  const run = uploadQueue.then(task, task);
  uploadQueue = run.catch(() => undefined);
  return run;
}

/**
 * One photo slot: take it with the phone's camera (or choose a file),
 * see it, and it uploads at once. A selfie must be a photo; an ID side may
 * also be a scanned PDF.
 *
 * `capture` opens the right camera on a phone — the back one for an ID,
 * the front one for a selfie. On a laptop it is a normal file picker.
 */
export function PhotoUpload({
  kind,
  label,
  hint,
  uploaded,
  onUploaded,
}: {
  kind: DocumentKind;
  label: string;
  hint: string;
  uploaded: boolean;
  onUploaded: (next: MyIdentity) => void;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string | null; name: string } | null>(null);
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");

  const isSelfie = kind === "selfie";
  const accept = isSelfie ? PHOTO_TYPES : [...PHOTO_TYPES, "application/pdf"];

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview]);

  async function choose(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!accept.includes(file.type)) {
      setState("error");
      setError(isSelfie ? "Use a JPEG, PNG or WebP photo." : "Use a JPEG, PNG or WebP photo, or a PDF scan.");
      return;
    }
    const { blob, name } = await shrinkPhoto(file);
    if (blob.size > MAX_BYTES) {
      setState("error");
      setError("That file is larger than 10 MB. Take the photo again, or scan at a lower resolution.");
      return;
    }
    setPreview({ url: file.type.startsWith("image/") ? URL.createObjectURL(blob) : null, name: file.name });
    setState("uploading");
    try {
      onUploaded(await queued(() => kycApi.upload(kind, blob, name)));
      setState("idle");
    } catch (e) {
      setState("error");
      const fields = e instanceof ApiError ? e.fieldErrors : {};
      setError(fields.file?.[0] ?? (e instanceof Error ? e.message : "The upload failed. Please try again."));
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  const done = uploaded && state === "idle";

  return (
    <div
      className={cn(
        "rounded-xl border bg-surface p-4 transition-colors",
        done ? "border-ok/40" : state === "error" ? "border-err/50" : "border-border-default",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "relative grid size-20 flex-none place-items-center overflow-hidden rounded-lg sm:size-24",
            preview?.url ? "bg-black" : "border border-dashed border-border-default bg-surface-alt",
          )}
        >
          {preview?.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview, not an optimisable asset
            <img src={preview.url} alt={`Your ${label.toLowerCase()}`} className="size-full object-cover" />
          ) : preview ? (
            <FileText aria-hidden="true" className="size-7 text-ink-dim" />
          ) : done ? (
            <CheckCircle2 aria-hidden="true" className="size-7 text-ok" />
          ) : (
            <Camera aria-hidden="true" className="size-7 text-ink-mute" />
          )}
          {state === "uploading" ? (
            <span className="absolute inset-0 grid place-items-center bg-black/50">
              <Loader2 aria-hidden="true" className="size-6 animate-spin text-white" />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="block text-[15px] font-bold text-ink">
            {label}
          </label>
          <p className="mt-0.5 text-[13.5px] leading-snug text-ink-dim">{hint}</p>
          <p aria-live="polite" className="mt-1.5 text-[13px] font-bold">
            {state === "uploading" ? (
              <span className="text-ink-dim">Uploading…</span>
            ) : state === "error" ? (
              <span className="text-err">{error}</span>
            ) : done ? (
              <span className="text-ok">Uploaded</span>
            ) : null}
          </p>
        </div>
      </div>

      <input
        ref={input}
        id={inputId}
        type="file"
        accept={accept.join(",")}
        capture={isSelfie ? "user" : "environment"}
        className="sr-only"
        onChange={(e) => void choose(e.target.files?.[0])}
        disabled={state === "uploading"}
      />
      <Button
        type="button"
        variant={done ? "outline" : "default"}
        className="mt-3 h-11 w-full sm:w-auto"
        disabled={state === "uploading"}
        onClick={() => input.current?.click()}
      >
        {done ? <RefreshCw aria-hidden="true" /> : <Camera aria-hidden="true" />}
        {done ? "Replace" : isSelfie ? "Take a selfie" : "Take or choose a photo"}
      </Button>
    </div>
  );
}
