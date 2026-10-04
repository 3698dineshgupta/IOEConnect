import type { GradesheetInput } from "./types";
import { isoDay, slugify, validateInput } from "./format";

export type { GradesheetInput } from "./types";

async function buildDocument(input: GradesheetInput) {
  validateInput(input);
  // Heavy imports stay lazy so nothing loads until a gradesheet is requested.
  const [{ createElement }, { GradesheetDocument }] = await Promise.all([
    import("react"),
    import("./GradesheetDocument"),
  ]);
  return createElement(GradesheetDocument, { input });
}

export function gradesheetFilename(input: GradesheetInput): string {
  return `IOE-Connect-Gradesheet-${slugify(input.student?.name ?? "")}-${isoDay(input.generatedAt)}.pdf`;
}

/** Browser only: builds the PDF and triggers a download. */
export async function downloadGradesheet(input: GradesheetInput): Promise<void> {
  const element = await buildDocument(input);
  const { pdf } = await import("@react-pdf/renderer");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(element as any).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = gradesheetFilename(input);
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Node/tests: renders the PDF to a Buffer. */
export async function renderGradesheetToBuffer(input: GradesheetInput): Promise<Buffer> {
  const element = await buildDocument(input);
  const { renderToBuffer } = await import("@react-pdf/renderer");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(element as any);
}
