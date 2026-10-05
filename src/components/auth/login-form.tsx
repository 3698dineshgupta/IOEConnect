"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, fieldErrors, safeNext } from "./form-field";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    setErrors({});
    setLoading(true);
    try {
      const { error } = await createBrowserClient().auth.signInWithPassword(parsed.data);
      if (error) {
        const msg = /confirm/i.test(error.message)
          ? "Confirm your email first. Check your inbox for the confirmation link."
          : "Email or password is incorrect.";
        setFormError(msg);
        return;
      }
      toast.success("Signed in");
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="ring-gradient rounded-2xl p-1 shadow-lg sm:p-2">
      <CardHeader className="pb-4">
        <CardTitle as="h1" className="text-3xl font-extrabold tracking-[-0.03em]">Welcome back</CardTitle>
        <CardDescription>Log in to open your dashboard and premium resources.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {formError && (
            <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">{formError}</p>
          )}
          <FormField id="email" label="Email" error={errors.email}>
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
          </FormField>
          <FormField id="password" label="Password" error={errors.password}>
            <Input id="password" name="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} />
          </FormField>
          <div className="flex justify-end">
            <Link href="/reset-password" className="link-underline inline-flex min-h-10 items-center text-sm font-medium text-primary">Forgot password?</Link>
          </div>
          <Button type="submit" className="w-full" size="lg" loading={loading}>Log in</Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to IOE Connect?{" "}
          <Link href="/register" className="link-underline inline-flex min-h-10 items-center font-semibold text-primary">Create an account</Link>
        </p>
      </CardContent>
    </Card>
  );
}
