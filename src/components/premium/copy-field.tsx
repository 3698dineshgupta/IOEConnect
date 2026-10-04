"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Copy, Share2 } from "lucide-react";
import { Button, Input } from "@/components/ui";

/** Read-only value with Copy (and native Share where supported). */
export function CopyField({
  value,
  label,
  shareText,
  mono = false,
}: {
  value: string;
  label: string;
  shareText?: string;
  mono?: boolean;
}) {
  const id = React.useId();
  const [copied, setCopied] = React.useState(false);
  const canShare = React.useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy automatically. Please select and copy it manually.");
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "IOE Connect", text: shareText, url: value.startsWith("http") ? value : undefined });
    } catch {
      // user cancelled or share failed: nothing to do
    }
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          id={id}
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className={mono ? "min-w-0 flex-1 font-mono" : "min-w-0 flex-1"}
        />
        <Button variant="outline" onClick={copy} aria-label={`Copy ${label}`} className="shrink-0">
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </Button>
        {canShare && shareText && (
          <Button variant="primary" onClick={share} aria-label={`Share ${label}`} className="shrink-0">
            <Share2 aria-hidden />
            <span className="hidden sm:inline">Share</span>
          </Button>
        )}
      </div>
    </div>
  );
}
