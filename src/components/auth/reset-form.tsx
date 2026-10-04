"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, fieldErrors } from "./form-field";

const requestSchema = z.object({ email: z.string().trim().email("Enter a valid email address.") });
const updateSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters.").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match." });

export function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code");
  const [mode, setMode] = useState<"request" | "update">("request");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Switch to "set new password" once Supabase establishes a recovery session.
  useEffect(() => {
    const supabase = createBrowserClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setFormError("This reset link is invalid or has expired. Request a new one.");
        else setMode("update");
      });
    }
    return () => sub.subscription.unsubscribe();
  }, [code]);

  async function onRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const parsed = requestSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    setErrors({});
    setLoading(true);
    try {
      const { error } = await createBrowserClient().auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) setFormError("Could not send the reset email. Try again in a moment.");
      else setSent(true);
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const parsed = updateSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    setErrors({});
    setLoading(true);
    try {
      const { error } = await createBrowserClient().auth.updateUser({ password: parsed.data.password });
      if (error) {
        setFormError("Could not update your password. The link may have expired. Request a new one.");
        return;
      }
      toast.success("Password updated");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="ring-gradient rounded-2xl p-1 shadow-lg sm:p-2">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-success-soft ring-1 ring-success/20 text-success">
            <MailCheck className="size-6" aria-hidden />
          </span>
          <h1 className="mt-4 text-xl font-bold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">If an account exists for that address, a reset link is on its way.</p>
          <Link href="/login" className="mt-6 inline-flex min-h-10 items-center text-sm link-underline font-semibold text-primary">Back to log in</Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="ring-gradient rounded-2xl p-1 shadow-lg sm:p-2">
      <CardHeader className="pb-4">
        <CardTitle className="text-3xl font-extrabold tracking-[-0.03em]">{mode === "update" ? "Set a new password" : "Reset your password"}</CardTitle>
        <CardDescription>
          {mode === "update" ? "Choose a password you have not used elsewhere." : "Enter your email and we will send you a reset link."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mode === "request" ? (
          <form onSubmit={onRequest} noValidate className="space-y-4">
            {formError && <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">{formError}</p>}
            <FormField id="email" label="Email" error={errors.email}>
              <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
            </FormField>
            <Button type="submit" className="w-full" size="lg" loading={loading}>Send reset link</Button>
          </form>
        ) : (
          <form onSubmit={onUpdate} noValidate className="space-y-4">
            {formError && <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">{formError}</p>}
            <FormField id="password" label="New password" error={errors.password} hint="At least 8 characters.">
              <Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} />
            </FormField>
            <FormField id="confirm" label="Confirm password" error={errors.confirm}>
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} aria-describedby={errors.confirm ? "confirm-error" : undefined} />
            </FormField>
            <Button type="submit" className="w-full" size="lg" loading={loading}>Update password</Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="link-underline inline-flex min-h-10 items-center font-semibold text-primary">Back to log in</Link>
        </p>
      </CardContent>
    </Card>
  );
}
