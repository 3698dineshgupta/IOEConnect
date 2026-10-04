"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, fieldErrors } from "./form-field";

export type ProgramOption = { slug: string; name: string };

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(72, "Use 72 characters or fewer."),
  college: z.string().trim().min(2, "Enter your campus or college.").max(120),
  program: z.string().trim().min(1, "Choose your program."),
  year: z.coerce.number().int().min(1, "Choose your year.").max(4),
  semester: z.coerce.number().int().min(1, "Choose your semester.").max(8),
  referral_code: z.string().trim().max(32).optional(),
});

export function RegisterForm({ programs = [], initialReferral = "" }: { programs?: ProgramOption[]; initialReferral?: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    setErrors({});
    const { email, password, referral_code, ...meta } = parsed.data;
    setLoading(true);
    try {
      const { data, error } = await createBrowserClient().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          data: { ...meta, referral_code: referral_code || null },
        },
      });
      if (error) {
        setFormError(
          /registered|exists/i.test(error.message)
            ? "An account with this email already exists. Log in instead."
            : "Could not create your account. Check your details and try again.",
        );
        return;
      }
      if (data.session) {
        toast.success("Account created");
        router.replace("/dashboard");
        router.refresh();
      } else {
        setSentTo(email);
        toast.success("Account created. Confirm your email to continue.");
      }
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <Card className="ring-gradient rounded-2xl p-1 shadow-lg sm:p-2">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-success-soft ring-1 ring-success/20 text-success">
            <MailCheck className="size-6" aria-hidden />
          </span>
          <h1 className="mt-4 text-xl font-bold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a confirmation link to <strong className="text-foreground">{sentTo}</strong>. Open it, then log in.
          </p>
          <Link href="/login" className="mt-6 inline-flex min-h-10 items-center text-sm link-underline font-semibold text-primary">Go to log in</Link>
        </CardContent>
      </Card>
    );
  }

  const err = (k: string) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-error` : undefined });

  return (
    <Card className="ring-gradient rounded-2xl p-1 shadow-lg sm:p-2">
      <CardHeader className="pb-4">
        <CardTitle className="text-3xl font-extrabold tracking-[-0.03em]">Create your account</CardTitle>
        <CardDescription>Free access to notes and PYQs, matched to your semester.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {formError && <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">{formError}</p>}
          <FormField id="full_name" label="Full name" error={errors.full_name}>
            <Input id="full_name" name="full_name" autoComplete="name" {...err("full_name")} />
          </FormField>
          <FormField id="email" label="Email" error={errors.email}>
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" {...err("email")} />
          </FormField>
          <FormField id="password" label="Password" error={errors.password} hint="At least 8 characters.">
            <Input id="password" name="password" type="password" autoComplete="new-password" {...err("password")} />
          </FormField>
          <FormField id="college" label="Campus" error={errors.college}>
            <Input id="college" name="college" placeholder="e.g. Pulchowk Campus" autoComplete="organization" {...err("college")} />
          </FormField>
          <FormField id="program" label="Program" error={errors.program}>
            {programs.length > 0 ? (
              <Select id="program" name="program" defaultValue="" {...err("program")}>
                <option value="" disabled>Select program</option>
                {programs.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </Select>
            ) : (
              <Input id="program" name="program" placeholder="e.g. Computer Engineering" {...err("program")} />
            )}
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="year" label="Year" error={errors.year}>
              <Select id="year" name="year" defaultValue="" {...err("year")}>
                <option value="" disabled>Year</option>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>Year {n}</option>)}
              </Select>
            </FormField>
            <FormField id="semester" label="Semester" error={errors.semester}>
              <Select id="semester" name="semester" defaultValue="" {...err("semester")}>
                <option value="" disabled>Semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>Semester {n}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField id="referral_code" label="Referral code (optional)" error={errors.referral_code}>
            <Input id="referral_code" name="referral_code" defaultValue={initialReferral} autoCapitalize="characters" autoComplete="off" />
          </FormField>
          <Button type="submit" className="w-full" size="lg" loading={loading}>Create account</Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="link-underline inline-flex min-h-10 items-center font-semibold text-primary">Log in</Link>
        </p>
      </CardContent>
    </Card>
  );
}
