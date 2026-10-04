import { ChevronDown } from "lucide-react";
import { DEFAULT_GRADE_BANDS, type GradeBand } from "@/lib/scgpa";

/** Disclosure with the active grading scale and the weighting rule. */
export function HowCalculated({ bands }: { bands: GradeBand[] }) {
  const sorted = [...bands].sort((a, b) => b.min_percent - a.min_percent);
  const isDefault =
    sorted.length === DEFAULT_GRADE_BANDS.length &&
    sorted.every((b, i) => b.grade === DEFAULT_GRADE_BANDS[i].grade && b.points === DEFAULT_GRADE_BANDS[i].points && b.min_percent === DEFAULT_GRADE_BANDS[i].min_percent);
  return (
    <details className="group rounded-2xl border border-border bg-card/70 shadow-xs">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
        How it&apos;s calculated
        <ChevronDown aria-hidden className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="grid gap-6 border-t border-border px-4 py-5 text-sm sm:px-5 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <table className="w-full text-left">
          <caption className="mb-2 text-left text-xs font-semibold text-muted-foreground">Grading scale</caption>
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th scope="col" className="pb-1.5 font-medium">Grade</th>
              <th scope="col" className="pb-1.5 text-right font-medium">Points</th>
              <th scope="col" className="pb-1.5 text-right font-medium">Marks</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {sorted.map((b, i) => {
              const upper = i === 0 ? null : sorted[i - 1].min_percent;
              return (
                <tr key={b.grade} className="border-t border-hairline">
                  <td className="py-1.5 font-semibold">{b.grade}</td>
                  <td className="py-1.5 text-right">{b.points.toFixed(1)}</td>
                  <td className="py-1.5 text-right text-muted-foreground">
                    {upper === null ? `≥ ${b.min_percent}%` : b.min_percent === 0 ? `< ${upper}%` : `${b.min_percent}–<${upper}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="space-y-3 text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Each subject.</span> Percentage = marks obtained ÷ full marks × 100. The
            grade is the highest band your percentage reaches.
          </p>
          <p>
            <span className="font-semibold text-foreground">SGPA.</span> Grade points are averaged, weighted by each subject&apos;s full
            marks, so a 150-mark subject counts more than a 50-mark one. When every subject you entered in a semester has credit hours,
            credits are used as the weight instead.
          </p>
          <p>
            <span className="font-semibold text-foreground">CGPA.</span> Your SGPAs are averaged across the semesters you filled in,
            each weighted by that semester&apos;s total full marks (or total credits, when every semester uses credits).
          </p>
          <p>Subjects without marks are left out. Results are shown to two decimals.</p>
          {isDefault && (
            <p className="text-xs">
              These grade bands are default values that haven&apos;t yet been checked against the official TU/IOE grading rules.
            </p>
          )}
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs font-medium text-warning">
            Unofficial calculator — not an official TU/IOE result.
          </p>
        </div>
      </div>
    </details>
  );
}
