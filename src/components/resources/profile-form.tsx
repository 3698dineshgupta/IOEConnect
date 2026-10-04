"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import { updateProfile, type ProfileFormState } from "@/app/profile/actions";
import { toRoman } from "./format";

interface Props {
  defaults: { full_name: string; college: string; program_id: string; year: string; semester: string };
  programs: Array<{ id: string; name: string }>;
}

const initial: ProfileFormState = { ok: false };

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-xs text-danger">
      {message}
    </p>
  ) : null;
}

export function ProfileForm({ defaults, programs }: Props) {
  const [state, action, pending] = useActionState(updateProfile, initial);
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" defaultValue={defaults.full_name} required maxLength={100} autoComplete="name" aria-invalid={!!err.full_name} aria-describedby="full_name-err" />
        <FieldError id="full_name-err" message={err.full_name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="college">College</Label>
        <Input id="college" name="college" defaultValue={defaults.college} maxLength={150} aria-invalid={!!err.college} aria-describedby="college-err" />
        <FieldError id="college-err" message={err.college} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="program_id">Program</Label>
        <Select id="program_id" name="program_id" defaultValue={defaults.program_id}>
          <option value="">Not set</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <FieldError id="program-err" message={err.program_id} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="year">Year</Label>
          <Select id="year" name="year" defaultValue={defaults.year}>
            <option value="">Not set</option>
            {[1, 2, 3, 4].map((y) => (
              <option key={y} value={y}>
                Year {toRoman(y)}
              </option>
            ))}
          </Select>
          <FieldError id="year-err" message={err.year} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="semester">Semester</Label>
          <Select id="semester" name="semester" defaultValue={defaults.semester}>
            <option value="">Not set</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Semester {toRoman(s)}
              </option>
            ))}
          </Select>
          <FieldError id="semester-err" message={err.semester} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          Save changes
        </Button>
        <p role="status" aria-live="polite" className={state.ok ? "text-sm text-success" : "text-sm text-danger"}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
