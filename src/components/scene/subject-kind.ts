/** Pure keyword mapper (no imports) — safe on server, client and in node tests. */

export const SUBJECT_ICON_KINDS = [
  "programming",
  "mathematics",
  "networks",
  "database",
  "ai",
  "os",
  "electronics",
  "physics",
  "chemistry",
  "generic",
] as const;

export type SubjectIconKind = (typeof SUBJECT_ICON_KINDS)[number];

// Order matters: first match wins (specific before general).
const RULES: [SubjectIconKind, RegExp][] = [
  ["database", /\b(database|databases|dbms|rdbms|sql|nosql|data mining|data warehous\w*|big data|information systems?)\b/],
  // Non-technical subjects whose names contain technical words ("Communication English").
  ["generic", /\b(english|nepali|sociology|economics|management|entrepreneurship|technical writing|report writing|drawing|project)\b/],
  ["ai", /\b(ai|artificial intelligence|machine learning|deep learning|neural|data science|computer vision|image processing|pattern recognition|natural language|nlp|soft computing|fuzzy)\b/],
  ["networks", /\b(networks?|networking|communications?|internet|telecom\w*|wireless|distributed systems?|cloud|network security|cryptography|cyber)\b/],
  ["os", /\b(os|operating systems?|computer architecture|computer organi[sz]ation|microprocessors?|microcontrollers?|embedded|system programming|processor)\b/],
  ["programming", /\b(programming|programs?|oop|object oriented|data structures?|algorithms?|software|web|java|python|javascript|compiler|computer graphics|simulation|c\+\+|coding)\b/],
  ["electronics", /\b(electronics?|electronic devices|electrical|circuits?|digital logic|logic design|logic circuits?|instrumentation|signals?|control systems?|vlsi|power systems?|semiconductor)\b/],
  ["mathematics", /\b(math\w*|calculus|algebra|statistics|probability|numerical|discrete|differential|linear|theory of computation|automata|graph theory|operations research)\b/],
  ["physics", /\b(physics|mechanics|thermodynamics?|thermal|optics|fluid|dynamics|statics|heat|waves?)\b/],
  ["chemistry", /\b(chemistry|chemical|material science|materials|environment\w*|biology)\b/],
];

/**
 * Map a subject slug and/or name to an abstract icon kind.
 *   subjectIconKind("computer-programming") → "programming"
 *   subjectIconKind(null, "Engineering Mathematics I") → "mathematics"
 */
export function subjectIconKind(slug?: string | null, name?: string | null): SubjectIconKind {
  const text = `${name ?? ""} ${(slug ?? "").replace(/[-_]+/g, " ")}`.toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return "generic";
  for (const [kind, re] of RULES) if (re.test(text)) return kind;
  return "generic";
}
