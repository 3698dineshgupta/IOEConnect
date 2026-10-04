# `@/components/motion`

Client-side motion primitives built on the `motion` package (`motion/react`, v14). All are
`"use client"` leaves, SSR-safe, and safe to render from server components. Import from the barrel:

```ts
import { Reveal, Stagger, StaggerItem, TiltCard, MagneticButton, CountUp, Spotlight, useReducedMotion } from "@/components/motion";
```

Global behaviour: `ThemeProvider` wraps the app in `<MotionConfig reducedMotion="user">`, so every
motion transform animation is disabled for reduced-motion users; the components below also
degrade explicitly (fades only, no tilt/magnet). Motion language: UI 150–250ms, reveals ~600–700ms,
springs from `springs` in `presets.ts`.

> Note on SEO/no-JS: `Reveal`/`Stagger` render with `opacity: 0` until hydrated and in view. Text is
> still in the HTML. Don't wrap the LCP element (hero H1) in a long-delay Reveal.

---

## `Reveal`
Fade + slide in once when scrolled into view.

| prop | type | default |
|---|---|---|
| `as` | `"div" \| "section" \| "article" \| "header" \| "li" \| "ul" \| "ol" \| "span" \| "p" \| "h2"` | `"div"` |
| `delay` | seconds | `0` |
| `duration` | seconds | `0.7` |
| `y` / `x` | start offset px | `18` / `0` |
| `blur` | start with 6px blur | `false` |
| `once` | only first time | `true` |
| `amount` | visible fraction to trigger | `0.2` |
| `className`, `id`, `style` | | |

```tsx
<Reveal as="section" className="py-24" delay={0.1}>…</Reveal>
```

## `Stagger` + `StaggerItem`
Parent reveals children sequentially. `Stagger` props: `as`, `delay` (before first child),
`stagger` (s between children, default `0.08`), `once`, `amount` (default `0.15`), `className`.
`StaggerItem` props: `as`, `y` (default `16`), `duration` (default `0.6`), `className`.

```tsx
<Stagger as="ul" className="grid gap-4 md:grid-cols-3">
  {items.map((it) => (
    <StaggerItem as="li" key={it.id}><FeatureCard {...it} /></StaggerItem>
  ))}
</Stagger>
```

## `TiltCard`
Pointer-driven 3D tilt (spring-damped) with perspective, lifting shadow, optional glare.
Static on touch/coarse pointers and under reduced motion. Accepts div HTML attributes.

| prop | type | default |
|---|---|---|
| `maxTilt` | degrees | `7` |
| `scale` | hover scale | `1.015` |
| `perspective` | px | `900` |
| `glare` | moving light overlay | `false` |
| `lift` | shadow-xl on hover | `true` |
| `className` | outer wrapper (put rounding here) | |
| `innerClassName` | rotating layer (`preserve-3d`) | |

```tsx
<TiltCard className="rounded-2xl" glare>
  <article className="h-full rounded-2xl border border-border bg-card p-6">
    <SubjectIcon kind="programming" className="[transform:translateZ(30px)]" />
  </article>
</TiltCard>
```

## `MagneticButton`
Wraps any button/link; drifts toward the pointer (max a few px) and springs back.
Props: `children`, `className`, `strength` (0–1, default `0.25`), `max` (px, default `6`).
`<Button magnetic>` uses it internally.

```tsx
<MagneticButton>
  <Link href="/resources" className={buttonVariants({ size: "lg" })}>Explore resources <ArrowRight /></Link>
</MagneticButton>
```

## `CountUp`
Counts to `value` when scrolled into view. SSR renders the final value; screen readers always get
the final value. **Pass real numbers only** (DB counts).

| prop | type | default |
|---|---|---|
| `value` | number | required |
| `from` | number | `0` |
| `duration` | seconds | `1.4` |
| `locale` | Intl locale | `"en-US"` |
| `format` | `Intl.NumberFormatOptions` | — |
| `prefix` / `suffix` | string | `""` |
| `className` | | |

```tsx
<CountUp value={subjectCount} suffix=" subjects" className="text-3xl font-extrabold" />
```

## `Spotlight`
Container with a soft glow + 1px border highlight following the mouse (CSS variables, no
re-renders). Give it rounding/border/background yourself. Accepts div HTML attributes.
Props: `size` (px, default `340`), `color` (default `var(--glow)`), `border` (default `true`),
`borderColor`.

```tsx
<Spotlight className="rounded-2xl border border-border bg-card p-6">…</Spotlight>
```

## Hooks (`hooks.ts`)
- `useReducedMotion(): boolean` — false on server/hydration, then the real preference.
- `useFinePointer(): boolean` — desktop mouse/trackpad (hover + fine pointer).
- `useMounted(): boolean` — true after hydration.
- `useMediaQuery(query, fallback = false): boolean`.
- `useInView(ref, { once = true, margin = "0px 0px -10% 0px", amount = "some" }): boolean`.
- `usePageVisible(): boolean` — document visibility (tab hidden → false).

## Presets (`presets.ts`, server-safe)
`easings.out | outExpo | inOut` (cubic-bezier arrays), `springs.snappy | soft | gentle`,
`durations.fast | base | slow | reveal` (seconds). CSS equivalents live in `globals.css`
(`--ease-out`, `--ease-out-expo`, `--ease-spring`, `--dur-fast|base|slow`).
