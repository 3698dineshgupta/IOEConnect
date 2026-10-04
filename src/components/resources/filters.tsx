import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { toRoman } from "./format";

export interface FilterValues {
  year?: string;
  semester?: string;
  type?: string;
  access?: string;
}

type Field = "year" | "semester" | "type" | "access";

export const FILTER_TYPES = ["NOTES", "PYQ", "SYLLABUS", "OTHER"] as const;
const TYPE_LABEL: Record<string, string> = { NOTES: "Notes", PYQ: "PYQ", SYLLABUS: "Syllabus", OTHER: "Other" };
const ACCESS_LABEL: Record<string, string> = { FREE: "Free", PREMIUM: "Premium" };

/** Validates a `type` search param against the filter options. */
export function parseFilterType(v: string | undefined) {
  return (FILTER_TYPES as readonly string[]).includes(v ?? "") ? v : undefined;
}
export function parseFilterAccess(v: string | undefined) {
  return v === "FREE" || v === "PREMIUM" ? v : undefined;
}

function label(field: Field, value: string) {
  if (field === "year") return `Year ${toRoman(Number(value))}`;
  if (field === "semester") return `Semester ${toRoman(Number(value))}`;
  if (field === "type") return TYPE_LABEL[value] ?? value;
  return ACCESS_LABEL[value] ?? value;
}

/** Plain GET form toolbar: works without JavaScript and keeps state in the URL. */
export function ResourceFilters({
  action,
  values,
  fields,
  yearOptions = [],
  semesterOptions = [],
  className,
}: {
  action: string;
  values: FilterValues;
  fields: Field[];
  yearOptions?: number[];
  semesterOptions?: number[];
  className?: string;
}) {
  const has = (f: Field) => fields.includes(f);
  const active = fields.filter((f) => values[f]);
  const without = (f: Field) => {
    const sp = new URLSearchParams();
    for (const k of fields) if (k !== f && values[k]) sp.set(k, values[k]!);
    const s = sp.toString();
    return s ? `${action}?${s}` : action;
  };
  const select = "h-11 rounded-xl border-border bg-background/70 text-base font-medium md:h-10 md:text-sm";

  return (
    <div className={cn("rounded-2xl border border-border bg-card/85 p-3 shadow-xs backdrop-blur sm:p-4", className)}>
      <form action={action} method="get" aria-label="Filter resources" className="flex flex-col gap-3 md:flex-row md:items-center">
        <span className="hidden shrink-0 items-center gap-2 pl-1 pr-2 text-sm font-semibold text-muted-foreground md:inline-flex">
          <SlidersHorizontal className="size-4" aria-hidden /> Filter
        </span>
        <div className="grid flex-1 grid-cols-1 gap-2 min-[480px]:grid-cols-2 md:flex md:flex-wrap">
          {has("year") && (
            <div className="md:w-40">
              <label htmlFor="f-year" className="sr-only">
                Year
              </label>
              <Select id="f-year" name="year" defaultValue={values.year ?? ""} className={select}>
                <option value="">All years</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    Year {toRoman(y)}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {has("semester") && (
            <div className="md:w-44">
              <label htmlFor="f-sem" className="sr-only">
                Semester
              </label>
              <Select id="f-sem" name="semester" defaultValue={values.semester ?? ""} className={select}>
                <option value="">All semesters</option>
                {semesterOptions.map((s) => (
                  <option key={s} value={s}>
                    Semester {toRoman(s)}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {has("type") && (
            <div className="md:w-40">
              <label htmlFor="f-type" className="sr-only">
                Resource type
              </label>
              <Select id="f-type" name="type" defaultValue={values.type ?? ""} className={select}>
                <option value="">All types</option>
                {FILTER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {has("access") && (
            <div className="md:w-44">
              <label htmlFor="f-access" className="sr-only">
                Access
              </label>
              <Select id="f-access" name="access" defaultValue={values.access ?? ""} className={select}>
                <option value="">Free and premium</option>
                <option value="FREE">Free</option>
                <option value="PREMIUM">Premium</option>
              </Select>
            </div>
          )}
        </div>
        <Button type="submit" className="h-11 w-full rounded-xl md:h-10 md:w-auto md:px-5">
          Apply
        </Button>
      </form>
      {active.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">Active:</span>
          {active.map((f) => (
            <Link
              key={f}
              href={without(f)}
              className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary-soft py-1 pl-3 pr-2.5 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/15 transition-colors hover:bg-primary hover:text-white"
              aria-label={`Remove filter ${label(f, values[f]!)}`}
            >
              {label(f, values[f]!)} <X className="size-3" aria-hidden />
            </Link>
          ))}
          <Link href={action} className="link-underline ml-1 inline-flex min-h-9 items-center text-xs font-medium text-muted-foreground hover:text-foreground">
            Clear all
          </Link>
        </div>
      )}
    </div>
  );
}
