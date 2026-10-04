"use client";

import { Select } from "@/components/ui";
import type { CalcElectiveGroup } from "./types";

/** "Choose your elective" select for one elective group. Empty = not counted. */
export function ElectivePicker({
  semester,
  group,
  value,
  onChoose,
}: {
  semester: number;
  group: CalcElectiveGroup;
  value: string;
  onChoose: (semester: number, group: string, slug: string) => void;
}) {
  const id = `el-${semester}-${group.label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div className="min-w-0 sm:w-44 sm:shrink-0">
        <label htmlFor={id} className="text-sm font-semibold tracking-tight text-foreground">
          {group.label}
        </label>
        <p className="text-xs text-muted-foreground">
          {value ? "Counted in your SGPA" : `Choose one of ${group.options.length}`}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <Select id={id} value={value} onChange={(e) => onChoose(semester, group.label, e.target.value)} className="h-11 sm:h-10">
          <option value="">Choose your elective</option>
          {group.options.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.code ? `${o.code} — ${o.name}` : o.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
