# IOE Connect — Premium Redesign Brief (binding for all UI agents)

Goal: rethink the whole UI as a premium "future of engineering education" product (Linear / Vercel / Apple Education / Stripe polish). NOT small cosmetic tweaks: layout, spacing, type, cards, nav, motion, interactions. Keep ALL existing functionality, routes, data and auth working.

## Hard rules
- No fabricated content. Syllabus unit/topic/hour/mark breakdowns, credits ("4 Credits"), stats ("50+ Subjects"), progress percentages do NOT exist unless in the DB. Show them only when real data exists (e.g. `subjects.credits` not null; counts from queries). Otherwise omit or show the honest state ("Syllabus PDF available" → opens viewer).
- PDFs are VIEW-ONLY. Never add download buttons/links. "Open" = `/view/[resourceId]`.
- Keep existing Tailwind token NAMES (background, foreground, card, muted, muted-foreground, border, input, primary, navy, accent, success, warning, danger, ring + -soft variants) so untouched pages keep working; change their VALUES and add new tokens. Dark mode is class-based `.dark`.
- Server components stay server components; only the interactive/3D leaf is `"use client"`. Never import server-only code in client files.
- Respect `prefers-reduced-motion` (disable 3D motion, parallax, floating; keep simple fades). Lazy-load all 3D (`next/dynamic`, `ssr:false`, IntersectionObserver gate), cap DPR, pause when off-screen/tab hidden, low-poly, no external model/texture downloads. Mobile/tablet: simplified static or CSS-only scene.
- A11y: contrast, focus rings, semantic HTML, accessible accordions/dialogs/combobox, alt text. No horizontal overflow on mobile.
- Do not run `next build` / `next dev` (a dev server already runs on :3000; don't touch `.next`). Verify with `npx tsc --noEmit` + `npx eslint <your files>`. Do not read `.env*`.

## Palette
Light: bg #F8FAFC, soft #F1F5F9, text deep navy. Dark: bg #050B14, cards #0B1628, border rgba(255,255,255,.08), text #F8FAFC, secondary #94A3B8, blue glow rgba(37,99,235,.25).
Brand: deep navy #07111F, midnight #0B1628, electric blue #2563EB, bright blue #3B82F6. Accents: cyan #22D3EE, violet #8B5CF6, gold #F59E0B (sparingly). Gradients used carefully (one headline highlight, a few glows). No gaming look, no heavy glassmorphism, not everything rounded, no childish colours.
Backgrounds: layered — faint grid, soft radial gradients, blurred blue light blobs, subtle noise, very subtle particles. Readable.
Type: Plus Jakarta Sans or Geist (already loaded: Plus Jakarta Sans + Geist Mono). Heavy tight headings, comfortable body, little all-caps.

## Motion language
UI interactions 150–250ms, transitions 400–800ms, ambient float 2–6s. Spring physics (framer-motion `motion` package). Magnetic buttons (tiny), 3D card tilt on pointer, count-up numbers in viewport, staggered fade/slide-in via IntersectionObserver/`whileInView`, animated link underlines, springy accordions, navbar shrink on scroll.

## Components (foundation agent builds; others consume)
`src/components/motion/`: `Reveal`, `Stagger`, `TiltCard`, `MagneticButton`, `CountUp`, `Spotlight`, `useReducedMotion` helper; `src/components/scene/`: `HeroScene` (R3F: floating books, laptop, graduation cap, formula/code/PDF cards, circuit board, particles, mouse parallax) + `ProgramScene` (laptop/code/circuit/network/database/AI-node network with animated connection lines) + `SubjectIcon` (abstract icon per subject category: programming=code cube, mathematics=sphere, networks=connected nodes, database=stacked cylinders, AI=neural network, OS=processor, electronics=circuit, physics=atom, chemistry=molecule; fall back to a generic cube; map by subject slug/name keywords; CSS/SVG on small cards, not one WebGL canvas per card).
`src/components/brand/`: premium logo (small 3D-ish graduation-cap icon, blue/cyan accent, subtle glow, clean wordmark "ioeconnect").
`src/components/layout/`: floating sticky navbar (max-w ~1200–1280, thin border, soft shadow, blur, slightly rounded, shrinks on scroll; links Resources, Programs, PYQs, Notes, Tools; search with ⌘K/Ctrl K; SCGPA Calculator; Login / Sign up or user menu; mobile: compact bar + sheet + existing bottom nav). Keep `PublicShell`, `SiteHeader`, `SiteFooter`, `MobileBottomNav`, `UserMenu` exports/props stable. Redesign footer too.

## Page requirements
Home: cinematic hero — LEFT badge "✦ BUILT FOR IOE STUDENTS", H1 "Everything you need to master IOE." (highlight "master IOE" with subtle blue gradient), supporting copy, CTAs [Explore Resources →] [Explore CSE →], ticks (Subjects, PYQs, Notes, Syllabus, Academic Tools — real counts only where shown); RIGHT interactive 3D scene with mouse parallax (CSS 3D fallback). Then: features, premium program section, PYQ section, journey/coverage (real data), SCGPA teaser, premium teaser, FAQ, footer.
Search: large centered premium search ("Search subjects, notes, PYQs…"), Popular chips (Computer Programming, Mathematics I, Data Structure, Computer Networks — link/search them), focus expands + subtle backdrop dim + floating suggestions panel + ⌘K/Ctrl K shortcut; results as cards. Reuse `/resources/search` route handler.
Program: large dark-navy card "COMPUTER ENGINEERING / CSE · 4 Years • 8 Semesters · Explore the complete academic journey [Explore Program →]" with 3D/animated visualization (grid, glow, light streak).
Year/semester: elegant timeline YEAR 1..4 with dots on a line, semesters beneath, animated progress line, hover illuminates, click smooth-scrolls to semester.
Subject cards: number, name, code, (credits if present), semester, resource availability chips (Notes / PYQs / Syllabus — live ones are links, missing are muted "Coming soon"), animated subject icon, subtle gradient, hover depth/glow, arrow. Electives grouped by `elective_group` (Elective I/II/III — choose one).
Subject page: hero (name, code, short description if present), tabs/buttons Notes · Syllabus · PYQs; syllabus section: if a SYLLABUS resource exists show a premium "Official syllabus" card opening the viewer; accordion UI only if structured syllabus data exists (it does not today — do not invent units). PYQ section: horizontal timeline of year cards from `available_years` (+ `year_page_ranges` deep-link into the viewer page if supported), hover lift/glow; click opens `/view/[id]` (view-only). Honest empty states with "Request resource" CTA.
Optional journey widget (real coverage): subjects with Notes / PYQs / Syllabus published ÷ total subjects.
Other pages (login/register, dashboard, premium, calculator, profile, contact, merch, my-*): restyle to the same system via tokens + shared components; keep behaviour. Admin area: adopt new tokens/typography only; do not redesign layouts.

## Ownership (to avoid conflicts)
- Foundation: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/{motion,scene,brand,layout,theme,ui}/**`, `package.json` deps.
- Home: `src/app/page.tsx`, `src/components/home/**`.
- Browse: `src/app/resources/**`, `src/app/subject/**`, `src/components/resources/**`, `src/components/search/**`.
- Rest: `src/app/{(auth),dashboard,premium,payment-history,referrals,calculator,(marketing),contact,merch,(shop),my-uploads,my-requests,profile,settings,report-bug}/**`, `src/components/{auth,premium,calculator,community}/**` (visual only).
