# `@/components/scene`

3D/illustrative scenes and subject icons. Import from the barrel only:

```ts
import { HeroSceneLazy, ProgramSceneLazy, HeroSceneFallback, ProgramSceneFallback, SubjectIcon, subjectIconKind } from "@/components/scene";
```

**Never import `./hero-scene` or `./program-scene` directly** — they pull three.js eagerly.
The lazy wrappers load them through `next/dynamic({ ssr: false })`.

No external assets: all geometry is procedural (low-poly boxes/cylinders/icosahedra) and the card,
screen and circuit textures are drawn on `<canvas>` with system fonts at runtime.

---

## `HeroSceneLazy`
Floating books, laptop (code screen), graduation cap, formula / code / PDF cards, circuit-board
floor, glowing particles, slow float + damped mouse parallax (window-wide pointer). Theme-aware
(reads `next-themes`; dark mode uses brighter emissives/particles).

| prop | type | default |
|---|---|---|
| `className` | sizing of the scene box (fills parent by default) | — |
| `forceFallback` | always use the CSS version | `false` |
| `label` | accessible description; omit = decorative (`aria-hidden`) | — |

```tsx
// server component
<div className="relative h-[420px] lg:h-[560px]">
  <HeroSceneLazy />
</div>
```

## `ProgramSceneLazy`
Laptop with code, circuit floor, processor chip, database stack, a small neural network and
network nodes, connected by lines with travelling data packets. Designed for the dark-navy program
card. Same props as `HeroSceneLazy` plus `dark?: boolean | "theme"` (default `true`; `"theme"`
follows the site theme).

```tsx
<div className="relative h-72 overflow-hidden rounded-3xl bg-gradient-navy">
  <ProgramSceneLazy />
</div>
```

### How the lazy wrappers decide / perf measures
- **WebGL only when** mounted on the client AND viewport ≥ 1024px AND hover+fine pointer AND no
  `prefers-reduced-motion` AND WebGL is available. Otherwise the **CSS/SVG fallback** renders
  (also server-rendered, so there is no layout shift or empty box).
- The canvas chunk is requested only once the box comes within 200px of the viewport
  (IntersectionObserver via `motion`'s `useInView`).
- `frameloop` is `"always"` only while in view **and** the tab is visible; otherwise `"never"`
  (zero GPU work, last frame stays on screen).
- DPR capped at `[1, 1.5]`; no shadows, no post-processing, no environment maps; `stencil: false`.
- The fallback stays visible until the WebGL context is created, then the canvas fades in (700ms).
- A render error in the canvas (e.g. context creation failure) is caught by an error boundary and
  the fallback is shown.
- Textures/geometries are disposed on unmount/theme change.

## `HeroSceneFallback` / `ProgramSceneFallback`
Pure markup (no hooks, no JS) — usable directly in server components. `className` prop only.
CSS-3D layered hero (tilted circuit floor, CSS laptop, books, SVG cap, floating cards, particles)
and an SVG network diagram with flowing dashed links. Ambient float stops under reduced motion.

```tsx
<HeroSceneFallback className="h-80" />
```

`useSceneMode(): "webgl" | "css"` is also exported if you need the same decision elsewhere.

---

## `SubjectIcon`
Abstract animated SVG icon per subject category. Pure SVG + CSS (server-safe, no WebGL — fine to
render dozens per page).

| prop | type | default |
|---|---|---|
| `kind` | `SubjectIconKind` | derived from `slug`/`name` |
| `slug`, `name` | string \| null | — |
| `size` | px | `48` |
| `animated` | `true` (gentle loop) \| `"hover"` (only while icon or a parent `.group` is hovered/focused) \| `false` | `true` |
| `tile` | soft tinted rounded tile behind the glyph | `true` |
| `title` | accessible name; omit = decorative | — |
| `className` | | — |

Kinds (`SUBJECT_ICON_KINDS`): `programming` (code cube), `mathematics` (sphere + orbit),
`networks` (connected nodes, flowing links), `database` (stacked cylinders), `ai` (neural net),
`os` (processor), `electronics` (circuit + resistor), `physics` (atom), `chemistry` (molecule),
`generic` (cube).

```tsx
<Link href={`/subject/${s.slug}`} className="group …">
  <SubjectIcon slug={s.slug} name={s.name} size={44} animated="hover" />
</Link>
```

## `subjectIconKind(slug?, name?): SubjectIconKind`
Keyword mapper (pure, also in `subject-kind.ts`). Examples:
`"computer-programming"` → programming, `"Engineering Mathematics I"` → mathematics,
`"Data Structure and Algorithm"` → programming, `"Database Management System"` → database,
`"Microprocessor"` → os, `"Communication English"` → generic, `"Applied Mechanics"` → physics.
Tested against 29 IOE subject names.
