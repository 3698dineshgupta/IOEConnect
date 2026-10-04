import "server-only";

import { getPrograms, getProgramTree } from "@/lib/curriculum";
import type { SubjectOption } from "./common";

/** Flat list of subjects grouped by program + semester, for select inputs. */
export async function getSubjectOptions(): Promise<SubjectOption[]> {
  const programs = await getPrograms();
  const trees = await Promise.all(programs.map((p) => getProgramTree(p.slug)));
  const multi = programs.length > 1;
  const out: SubjectOption[] = [];
  trees.forEach((tree, i) => {
    if (!tree) return;
    const program = programs[i];
    for (const y of tree.years) {
      for (const s of y.semesters) {
        for (const sub of s.subjects) {
          out.push({
            id: sub.id,
            slug: sub.slug,
            name: sub.name,
            code: sub.code,
            group: `${program.slug}:${s.number}`,
            groupLabel: `${multi ? `${program.short_name ?? program.name} - ` : ""}Semester ${s.number}`,
          });
        }
      }
    }
  });
  return out;
}
