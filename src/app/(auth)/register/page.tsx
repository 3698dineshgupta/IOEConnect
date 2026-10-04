import type { Metadata } from "next";
import { RegisterForm, type ProgramOption } from "@/components/auth/register-form";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create account" };

async function loadPrograms(): Promise<ProgramOption[]> {
  try {
    const supabase = await createServerClient();
    const { data } = await supabase.from("programs").select("slug, name").eq("is_active", true).order("name");
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const [programs, sp] = await Promise.all([loadPrograms(), searchParams]);
  return <RegisterForm programs={programs} initialReferral={(sp.ref ?? "").slice(0, 32)} />;
}
