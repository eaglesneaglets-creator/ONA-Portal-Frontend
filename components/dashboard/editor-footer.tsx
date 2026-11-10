"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

/**
 * The foot of a staff editor dialog: Remove (asked twice, never on a new
 * record) on the left, Cancel and Save on the right.
 */
export function EditorFooter({
  busy,
  saveLabel = "Save",
  confirmLabel,
  onRemove,
  onCancel,
}: {
  busy: boolean;
  saveLabel?: string;
  /** What the second, confirming press says. */
  confirmLabel: string;
  /** Omit for a record that does not exist yet. */
  onRemove?: () => void;
  onCancel: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <DialogFooter className="sm:justify-between">
      {!onRemove ? (
        <span />
      ) : confirming ? (
        <Button type="button" className="h-11 bg-err text-white hover:bg-err/90" disabled={busy} onClick={onRemove}>
          {confirmLabel}
        </Button>
      ) : (
        <Button type="button" variant="ghost" className="h-11 text-err" disabled={busy} onClick={() => setConfirming(true)}>
          Remove
        </Button>
      )}
      <span className="flex gap-2">
        <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="h-11" disabled={busy}>
          {busy ? "Saving…" : saveLabel}
        </Button>
      </span>
    </DialogFooter>
  );
}
