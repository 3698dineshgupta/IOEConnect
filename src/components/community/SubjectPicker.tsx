"use client";

import * as React from "react";
import { Label, Select } from "@/components/ui";
import type { SubjectOption } from "./common";

/** Semester -> subject cascading select. `value` is a subject id ("" when none). */
export function SubjectPicker({
  options,
  value,
  onChange,
  idPrefix,
  allowOther,
  otherLabel = "Other / not listed",
  disabled,
  invalid,
}: {
  options: SubjectOption[];
  value: string;
  onChange: (subjectId: string) => void;
  idPrefix: string;
  allowOther?: boolean;
  otherLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const groups = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const o of options) if (!m.has(o.group)) m.set(o.group, o.groupLabel);
    return [...m.entries()].map(([group, label]) => ({ group, label }));
  }, [options]);

  const selected = options.find((o) => o.id === value);
  const [pickedGroup, setPickedGroup] = React.useState<string>(selected?.group ?? "");
  const group = selected?.group ?? pickedGroup;
  const subjects = options.filter((o) => o.group === group);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-semester`}>Semester</Label>
        <Select
          id={`${idPrefix}-semester`}
          value={group}
          disabled={disabled}
          onChange={(e) => {
            setPickedGroup(e.target.value);
            onChange("");
          }}
        >
          <option value="">{allowOther ? otherLabel : "Select semester"}</option>
          {groups.map((g) => (
            <option key={g.group} value={g.group}>
              {g.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-subject`}>Subject</Label>
        <Select
          id={`${idPrefix}-subject`}
          value={value}
          disabled={disabled || !group}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{group ? "Select subject" : "Choose a semester first"}</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.code ? ` (${s.code})` : ""}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
