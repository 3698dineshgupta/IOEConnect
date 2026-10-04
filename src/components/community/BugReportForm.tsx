"use client";

import * as React from "react";
import { Bug } from "lucide-react";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase/client";
import { submitBugReport } from "@/lib/actions/bugs";
import { formatBytes } from "@/lib/utils";
import { FormMessage } from "./FormMessage";

const MAX_SHOT_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

function detectBrowser(ua: string): string {
  const m =
    /(Edg|OPR|Firefox|Chrome|CriOS|FxiOS)\/([\d.]+)/.exec(ua) ?? /Version\/([\d.]+).*Safari/.exec(ua);
  if (!m) return "Unknown";
  if (m.length === 2) return `Safari ${m[1].split(".")[0]}`;
  const names: Record<string, string> = { Edg: "Edge", OPR: "Opera", CriOS: "Chrome (iOS)", FxiOS: "Firefox (iOS)" };
  return `${names[m[1]] ?? m[1]} ${m[2].split(".")[0]}`;
}

const noopSubscribe = () => () => {};

/** Page (path only: query/hash may hold tokens), device and browser; "" during SSR. */
function captureMeta(): string {
  const ua = navigator.userAgent;
  let source = location.origin + location.pathname;
  // On the dedicated page, report the page the user came from (same-origin only).
  if (location.pathname === "/report-bug" && document.referrer) {
    try {
      const ref = new URL(document.referrer);
      if (ref.origin === location.origin) source = ref.origin + ref.pathname;
    } catch {
      // ignore malformed referrer
    }
  }
  return JSON.stringify({ pageUrl: source, device: detectDevice(ua), browser: detectBrowser(ua) });
}

function detectDevice(ua: string): string {
  const kind = /iPad|Tablet/i.test(ua) ? "Tablet" : /Mobi|Android|iPhone/i.test(ua) ? "Mobile" : "Desktop";
  const os = /Windows/i.test(ua)
    ? "Windows"
    : /Android/i.test(ua)
      ? "Android"
      : /iPhone|iPad|iOS/i.test(ua)
        ? "iOS"
        : /Mac OS X/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Unknown OS";
  return `${kind} - ${os} - ${window.innerWidth}x${window.innerHeight}`;
}

/** Bug report form; page URL, device and browser are captured automatically. */
export function BugReportForm({ onSent, idPrefix = "bug" }: { onSent?: () => void; idPrefix?: string }) {
  const [userId, setUserId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const metaJson = React.useSyncExternalStore(noopSubscribe, captureMeta, () => "");
  const meta = React.useMemo(
    () => (metaJson ? (JSON.parse(metaJson) as { pageUrl: string; device: string; browser: string }) : { pageUrl: "", device: "", browser: "" }),
    [metaJson],
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    try {
      createBrowserClient()
        .auth.getUser()
        .then(({ data }) => {
          if (!cancelled) setUserId(data.user?.id ?? null);
        })
        .catch(() => undefined);
    } catch {
      // Supabase not configured in this environment: screenshot upload stays disabled.
    }
    return () => {
      cancelled = true;
    };
  }, []);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) return setFile(null);
    if (!EXT[f.type]) {
      e.target.value = "";
      setFile(null);
      return setError("Screenshots must be PNG, JPG or WebP images.");
    }
    if (f.size > MAX_SHOT_BYTES) {
      e.target.value = "";
      setFile(null);
      return setError(`That image is ${formatBytes(f.size)}. The maximum is 5 MB.`);
    }
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 4) return setError("Please give the bug a short title.");
    if (description.trim().length < 10) return setError("Please describe what happened (at least 10 characters).");
    setBusy(true);
    let screenshotPath: string | null = null;
    try {
      const supabase = createBrowserClient();
      if (file && userId) {
        screenshotPath = `${userId}/${crypto.randomUUID()}.${EXT[file.type]}`;
        const { error: upErr } = await supabase.storage
          .from("bug-screenshots")
          .upload(screenshotPath, file, { contentType: file.type, upsert: false });
        if (upErr) {
          console.error(upErr);
          screenshotPath = null;
          setError("The screenshot could not be uploaded. Remove it or try again.");
          return;
        }
      }
      const res = await submitBugReport({ title, description, screenshotPath, website, ...meta });
      if (!res.ok) {
        if (screenshotPath) await supabase.storage.from("bug-screenshots").remove([screenshotPath]).catch(() => undefined);
        setError(res.error);
        return;
      }
      setSent(true);
      onSent?.();
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <FormMessage kind="success">Thank you! Your bug report was sent to the team.</FormMessage>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-title`}>Title</Label>
        <Input id={`${idPrefix}-title`} value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. PDF viewer shows a blank page" disabled={busy} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-desc`}>What happened?</Label>
        <Textarea id={`${idPrefix}-desc`} value={description} maxLength={10000} rows={5} onChange={(e) => setDescription(e.target.value)} placeholder="Steps to reproduce, what you expected and what you saw." disabled={busy} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-shot`}>Screenshot (optional)</Label>
        <Input
          id={`${idPrefix}-shot`}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onFile}
          disabled={busy || !userId}
          className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-1 file:text-sm file:font-semibold file:text-primary"
        />
        {!userId && <p className="text-xs text-muted-foreground">Sign in to attach a screenshot.</p>}
      </div>
      <dl className="grid gap-x-4 gap-y-1 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground sm:grid-cols-[auto_1fr]">
        <dt className="font-semibold">Page</dt>
        <dd className="break-all">{meta.pageUrl || "-"}</dd>
        <dt className="font-semibold">Device</dt>
        <dd>{meta.device || "-"}</dd>
        <dt className="font-semibold">Browser</dt>
        <dd>{meta.browser || "-"}</dd>
      </dl>
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Button type="submit" loading={busy}>
        <Bug aria-hidden /> Send report
      </Button>
    </form>
  );
}
