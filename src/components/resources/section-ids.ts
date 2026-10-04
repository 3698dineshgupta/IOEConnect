// Plain module (no "use client"): imported by both the server program page and the client timeline.
// Functions exported from a "use client" file cannot be called from a server component.

/** Section ids the timeline scrolls to; the program page renders matching sections. */
export const yearSectionId = (n: number) => `year-${n}`;
export const semesterSectionId = (n: number) => `semester-${n}`;
