"use client";

import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};

export function ThemePreference() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
      {options.map(({ value, label, icon: Icon }) => {
        const selected = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(value)}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors",
              selected ? "border-primary bg-primary-soft text-primary" : "border-border bg-card hover:bg-muted",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        );
      })}
    </div>
  );
}

export function ChangePasswordForm() {
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    if (password.length < 8) return setMsg({ ok: false, text: "Use at least 8 characters." });
    if (password !== confirm) return setMsg({ ok: false, text: "The two passwords do not match." });
    setPending(true);
    setMsg(null);
    try {
      const { error } = await createBrowserClient().auth.updateUser({ password });
      if (error) setMsg({ ok: false, text: error.message || "We could not change your password." });
      else {
        setMsg({ ok: true, text: "Password changed." });
        form.reset();
      }
    } catch {
      setMsg({ ok: false, text: "We could not change your password. Try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          Change password
        </Button>
        <p role="status" aria-live="polite" className={cn("text-sm", msg?.ok ? "text-success" : "text-danger")}>
          {msg?.text}
        </p>
      </div>
    </form>
  );
}
