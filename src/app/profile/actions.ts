"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export interface ProfileFormState {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<"full_name" | "college" | "program_id" | "year" | "semester", string>>;
}

const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().int().min(min).max(max).nullable(),
  );

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name.").max(100, "Keep it under 100 characters."),
  college: z.string().trim().max(150, "Keep it under 150 characters.").transform((v) => v || null),
  program_id: z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid("Choose a valid program.").nullable()),
  year: optionalInt(1, 4),
  semester: optionalInt(1, 8),
});

export async function updateProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Your session has expired. Log in again." };

  const parsed = schema.safeParse({
    full_name: formData.get("full_name"),
    college: formData.get("college") ?? "",
    program_id: formData.get("program_id"),
    year: formData.get("year"),
    semester: formData.get("semester"),
  });
  if (!parsed.success) {
    const fieldErrors: NonNullable<ProfileFormState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<ProfileFormState["fieldErrors"]>;
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, message: "Check the highlighted fields.", fieldErrors };
  }

  try {
    const supabase = await createServerClient();
    // Only editable columns; role/premium/referral/email are never sent (and are guarded by a DB trigger).
    const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
    if (error) throw error;
  } catch (err) {
    console.error("[profile] update failed", err);
    return { ok: false, message: "We could not save your profile. Try again in a moment." };
  }
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true, message: "Profile saved." };
}
