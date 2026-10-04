// Lazy, safe-to-use entry points (do NOT import ./hero-scene or ./program-scene directly in pages:
// they pull three.js into the bundle eagerly).
export { HeroSceneLazy, ProgramSceneLazy, useSceneMode } from "./scene-lazy";
export type { HeroSceneLazyProps, ProgramSceneLazyProps } from "./scene-lazy";
export { HeroSceneFallback, ProgramSceneFallback } from "./fallbacks";
export { SubjectIcon, subjectIconKind, SUBJECT_ICON_KINDS } from "./subject-icon";
export type { SubjectIconProps, SubjectIconKind } from "./subject-icon";
