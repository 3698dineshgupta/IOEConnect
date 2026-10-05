import { ChevronDown } from "lucide-react";
import { type GradeBand } from "@/lib/scgpa";

/** Disclosure with the grading scale and the IOE rules the calculator applies. */
export function HowCalculated({ bands }: { bands: GradeBand[] }) {
  const sorted = [...bands].sort((a, b) => b.min_percent - a.min_percent);
  return (
    <details className="group rounded-2xl border border-border bg-card/70 shadow-xs">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
        How it&apos;s calculated
        <ChevronDown aria-hidden className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="grid gap-6 border-t border-border px-4 py-5 text-sm sm:px-5 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <table className="w-full text-left">
          <caption className="mb-2 text-left text-xs font-semibold text-muted-foreground">Grading scale (2080/81)</caption>
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th scope="col" className="pb-1.5 font-medium">Marks</th>
              <th scope="col" className="pb-1.5 text-right font-medium">Grade</th>
              <th scope="col" className="pb-1.5 text-right font-medium">Points</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {sorted.map((b, i) => {
              const upper = i === 0 ? null : sorted[i - 1].min_percent;
              return (
                <tr key={b.grade} className="border-t border-hairline">
                  <td className="py-1.5 text-muted-foreground">
                    {upper === null ? `${b.min_percent}% +` : b.min_percent === 0 ? `< ${upper}%` : `${b.min_percent}% – ${upper - 1}%`}
                  </td>
                  <td className="py-1.5 text-right font-semibold">{b.grade}</td>
                  <td className="py-1.5 text-right">{b.points.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="space-y-3 text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">20% rule (internal capping).</span> Your Internal mark can&apos;t be more than 20%
            higher than your Theory percentage: ceiling = Theory % + 20, and Internal counts as ceiling ÷ 100 × full internal marks if
            that is lower than what you entered. Example: Theory 18/60 (30%) and Internal 38/40 → ceiling 50% → Internal counts as 20/40.
          </p>
          <p>
            <span className="font-semibold text-foreground">Separate pass criteria.</span> You need at least 40% in each component:
            Theory ≥ 24/60, Internal ≥ 16/40, Practical ≥ 10/25. Failing any component gives an overall F.
          </p>
          <p>
            <span className="font-semibold text-foreground">Subject grade.</span> Total = Theory + counted Internal + Practical; the
            percentage of the subject&apos;s full marks gives the grade above.
          </p>
          <p>
            <span className="font-semibold text-foreground">SGPA</span> = Σ (grade point × credits) ÷ Σ credits, so high-credit subjects
            weigh more. <span className="font-semibold text-foreground">CGPA</span> averages your semesters, weighted by their credits.
          </p>
          <p>
            Credits come from the curriculum (or lecture hours ÷ 15). If yours differ, tap the credit number in a row and correct it.
            Subjects are counted once every part they have is filled. Results are shown to two decimals.
          </p>
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs font-medium text-warning">
            Unofficial calculator — not an official TU/IOE result.
          </p>
        </div>
      </div>
    </details>
  );
}
