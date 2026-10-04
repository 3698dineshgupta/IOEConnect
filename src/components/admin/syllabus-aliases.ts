/**
 * Explicit alias maps for matching bulk-upload PDF file names to subject slugs.
 * Keys are matched against the normalized file name stem (see `normalizeStem` in bulk-matching.ts),
 * as whole-word phrases. Keys are normalized the same way (plurals, "and"/"of", camelCase, digits and
 * noise words such as "ques"/"pyq"/"syllabus" do not matter). They apply to every resource type.
 */
export const CORE_ALIASES: Record<string, string> = {
  "mathematics i": "engineering-mathematics-i",
  "computer programming": "c-programming",
  "engineering drawing i": "engineering-drawing-i",
  "engineering physics": "engineering-physics",
  "applied mechanics": "applied-mechanics",
  "basic electrical engineering": "basic-electrical-engineering",
  "mathematics ii": "engineering-mathematics-ii",
  "engineering drawing ii": "engineering-drawing-ii",
  "basic electronics engineering": "basic-electronics",
  "engineering chemistry": "engineering-chemistry",
  "fundamentals of thermodynamics heat transfer": "thermodynamics",
  "mathematics iii": "engineering-mathematics-iii",
  "object oriented programming": "object-oriented-programming",
  "electrical circuit theory": "electrical-circuit-theory",
  "theory of computation": "theory-of-computation",
  "electronic devices circuits": "electronics-devices-and-circuit",
  "digital logic": "digital-logics",
  electromagnetism: "electromagnetism",
  "electrical machine": "electrical-machine-i",
  "numerical method": "numerical-method",
  "applied mathematics": "applied-mathematics",
  "instrumentation i": "instrumentation-i",
  "data structure and algorithm": "data-structure-and-algorithm",
  microprocessor: "microprocessor",
  "discrete structure": "discrete-structure",
  "communication english": "communication-english",
  "probability and statistics": "probability-and-statistics",
  "computer organization and architecture": "computer-organization-and-architecture",
  "software engineering": "software-engineering",
  "computer graphics": "computer-graphics",
  "instrumentation ii": "instrumentation-ii",
  "data communication": "data-communication",
  "engineering economics": "engineering-economics",
  "object oriented analysis and design": "object-oriented-analysis",
  "artificial intelligence": "artificial-intelligence",
  "operating system": "operating-system",
  "embedded system": "embedded-system",
  "database management system": "database-management-system",
  "organization and management": "organization-and-management",
  "ict project management": "ict-project-management",
  "workshop technology": "workshop-technology",
  "energy environment and society": "energy-environment-and-society",
  "distributed system": "distributed-system",
  "computer networks and security": "computer-network-and-security",
  "digital signal analysis and processing": "digital-signal-and-analysis-processing",
  "engineering professional practice": "engineering-professional-practice",
  "information system": "information-system",
  "internet and intranet": "internet-and-intranet",
  "simulation and modeling": "simulation-and-modeling",
};

/** Files whose name starts with E1-/E2-/E3- are elective candidates and may only match these. */
export const ELECTIVE_ALIASES: Record<string, string> = {
  // Elective I (E1-xx)
  "data mining and warehousing": "data-mining",
  "web development technology": "web-technology",
  "advanced java programming": "advanced-java",
  "image processing and pattern recognition": "image-processing",
  "radar": "radar-technology",
  "bio medical instrumentation": "biomedical-instrumentation",
  "biomedical instrumentation": "biomedical-instrumentation",
  // Elective II (E2-xx)
  "agile software development": "agile-software-development",
  "networking with ipv6": "networking-with-ipv6",
  "advanced computer architecture": "advanced-computer-architecture",
  "big data technologies": "big-data-technologies",
  "optical fiber communication system": "optical-fiber-communication-system",
  "broadcast engineering": "broadcast-engineering",
  "wireless communication": "wireless-communications",
  "database management system": "database-management-systems-elective",
  // Elective III (E3-xx)
  "multimedia system": "multimedia-system",
  "enterprise application design and development": "enterprise-application-design-and-development",
  "geographical information system": "geographical-information-system",
  "power electronics": "power-electronics",
  "remote sensing": "remote-sensing",
  "xml foundations techniques and applications": "xml-foundations-techniques-and-applications",
  "artificial intelligence": "artificial-intelligence-elective",
  "speech processing": "speech-processing",
  "telecommunication": "telecommunication",
};

/**
 * Exact file names from the owner's PYQ folder. Keys are written the way the stem normalizes
 * (noise words like "ques"/"old"/"past" are stripped anyway).
 */
export const PYQ_ALIASES: Record<string, string> = {
  "applied mechanics old ques": "applied-mechanics", // AppliedMechanicsOldQues.pdf
  "basic electronics engineering": "basic-electronics", // Basic-Electronics-Engineering.pdf
  "bee ques": "basic-electrical-engineering", // BEEQues.pdf
  chemistry: "engineering-chemistry", // Chemistry.pdf
  "c programming ques": "c-programming", // CProgrammingQues.pdf
  "drawing 1 ques": "engineering-drawing-i", // Drawing1Ques.pdf
  "engineering drawing ii": "engineering-drawing-ii", // Engineering-Drawing-II.pdf
  "math 2 past ques": "engineering-mathematics-ii", // math-2-past-ques.pdf
  "math 1 ques": "engineering-mathematics-i", // Math1Ques.pdf
  "physics ques": "engineering-physics", // PhysicsQues.pdf
  thermodynamics: "thermodynamics", // Thermodynamics.pdf
  // Typos / cryptic names from the rest of the owner's PYQ folder
  "computer orginization architecture": "computer-organization-and-architecture", // Computer-Orginization-and-Architecture.pdf
  "data structure algorithum": "data-structure-and-algorithm", // Data-Structure-and-Algorithum.pdf
  "digital signai analysis processing": "digital-signal-and-analysis-processing", // Digital-Signai-Analysis-_-Processing.pdf
  "web 4 1 bctbex": "web-technology", // Web4.1bctbex.pdf (Elective I)
  "biomed 4 1": "biomedical-instrumentation", // biomed4.1.pdf (Elective I)
};

/** Common abbreviations and short names, only where they point at exactly one core subject. */
export const GENERIC_ALIASES: Record<string, string> = {
  bee: "basic-electrical-engineering",
  ee: "basic-electrical-engineering",
  "math 1": "engineering-mathematics-i",
  "math 2": "engineering-mathematics-ii",
  "math 3": "engineering-mathematics-iii",
  "engineering mathematics 1": "engineering-mathematics-i",
  "engineering mathematics 2": "engineering-mathematics-ii",
  "engineering mathematics 3": "engineering-mathematics-iii",
  "drawing 1": "engineering-drawing-i",
  "drawing 2": "engineering-drawing-ii",
  "c programming": "c-programming",
  "c prog": "c-programming",
  physics: "engineering-physics",
  chemistry: "engineering-chemistry",
  thermodynamics: "thermodynamics",
  "basic electronics": "basic-electronics",
  oop: "object-oriented-programming",
  dsa: "data-structure-and-algorithm",
  dbms: "database-management-system",
  os: "operating-system",
  ai: "artificial-intelligence",
  coa: "computer-organization-and-architecture",
  tom: "theory-of-computation",
  dld: "digital-logics",
};
