# UmrohHub

Mobile-first web app guiding Indonesian pilgrims through independent (mandiri) Umrah preparation.
Product spec: `.plans/umrohhub-mvp-spec.md` — read it before building any feature.
Scope now: user-facing app only. Admin CMS is out of scope; content is edited via Supabase Studio.

## Stack

- Next.js 15 (App Router, TypeScript, `src/` dir, `@/*` import alias), React 19
- Tailwind CSS v4 (`src/app/globals.css`, no tailwind.config file)
- Supabase via `@supabase/ssr`: browser client `src/lib/supabase/client.ts`, server client `src/lib/supabase/server.ts`
- Vitest for unit tests (`*.test.ts` next to the code)
- Node 20, npm (never pnpm/yarn — `package-lock.json` is the lockfile)

## Important paths

- `src/app/` — routes (App Router)
- `src/components/ui/` — shared UI primitives (see Design system)
- `src/lib/` — shared helpers
- `.plans/` — product specs
- `factory/` — software factory state (see `.claude/skills/factory/SKILL.md`)

## Fresh checkout setup

```bash
npm install
cp .env.example .env.local   # fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Without real Supabase values the app still builds and pages that don't call Supabase still render.

## Dev server on a given port

```bash
npm run dev -- --port <port>
```

Several jobs and agents run at the same time on this machine, and the user keeps their own dev server on port 3000:

- Start the dev server in the background and stop **only that process**: `kill $(lsof -tiTCP:<port> -sTCP:LISTEN)`. Never use `pkill`, `killall` or anything that matches `next dev` by name.
- Never touch ports 3000 or 8000.

## Validation

```bash
npx eslint <changed files>   # lint only files you changed
npm run typecheck
npm run test
npm run build:check          # builds into .next-build so it can't corrupt a running dev server's .next
```

All four must pass before a change is ready. Use `build:check`, not `build`, for validation.

## Database (Supabase)

- Schema lives in `supabase/migrations/`. Create a file with `supabase migration new <snake_case_name>`; never edit a migration that is already on `main`.
- Seed/reference content goes in its own migration (idempotent `insert ... on conflict do update`), not in `supabase/seed.sql`.
- Jobs never touch the remote database: no `supabase db push`, `supabase link` or SQL against the hosted project. A human applies migrations after merge.
- To check a migration runs, use the local stack if Docker is available: `supabase start` then `supabase db reset --local`. Stop it with `supabase stop` when done.
- All worktrees share **one** local stack. Before `supabase start`, run `supabase status`: if it is already running, another job owns it. Wait (check every 30s, up to 15 minutes) instead of resetting or stopping it. If it is still busy, skip the local check and say so in your report.
- Generated types: `supabase gen types typescript --local > src/lib/supabase/database.types.ts` (local stack only).
- MVP tables: `trips`, `travelers`, `trip_step_config`, `trip_step_progress` are trip-owned (signed-in users read/write only rows of their own trips); `preparation_steps` (published only) and `city_cost_overrides` are read-only for any signed-in user. `anon` gets nothing.
- Database tests are pgTAP files in `supabase/tests/`; run them with `supabase test db` (local stack only).

## Conventions

- Every commit message is `<type>-<NNN> <message>`: the backlog task code, a space, then the message, no brackets (e.g. `fe-002 Add Card primitive`). Type is `infra`, `be` or `fe`. Every commit belongs to a backlog task — tooling and factory work gets an `infra-NNN` task first; there are no untagged commits.
- Job branches are `factory/<type>-<NNN>` (e.g. `factory/fe-004`).

- Mobile-first; minimum 44px tap targets; high contrast; one primary (indigo) CTA per screen.
- UI copy in Bahasa Indonesia by default; once i18n exists, all user-facing strings go through it.
- Responsive for web and mobile: build mobile-first, then give every screen a real desktop layout at `lg` (≥ 1024px) — wider container (max ~1200px), multi-column grids, hero text beside its illustration, top nav instead of BottomNav. A phone-width column centred on desktop is a bug. Check every UI change at 390px, 768px and 1280px.
- Server Components by default; add `"use client"` only where interactivity needs it.
- Every Supabase table gets RLS policies. Never use or commit the service-role key.
- Never commit `.env*` files except `.env.example`.

## Design system

Soft indigo direction (reference: `.plans/design-reference.png`). Tokens are CSS variables in `src/app/globals.css`, mapped to Tailwind in `@theme inline`. Every colour token is a 6-digit hex literal. New UI uses these tokens, never raw hex values or Tailwind palette colours (`bg-indigo-600`, `text-gray-700`, ...).

| Token | Use | Utilities |
| --- | --- | --- |
| `--background` | solid page fallback (lavender / deep navy) | `bg-background` |
| `--background-from` / `--background-to` | page gradient stops, top to bottom | `from-background-from`, `to-background-to` |
| `--surface` | cards, chips, icon buttons (white / lighter navy) | `bg-surface` |
| `--foreground` | primary ink text | `text-foreground` |
| `--muted` | secondary text | `text-muted` |
| `--border` | borders and dividers | `border-border` |
| `--primary` / `--primary-strong` | indigo-violet CTA gradient stops, selected chip, active nav tab | `bg-primary`, `from-primary`, `to-primary-strong`, `text-primary` |
| `--primary-foreground` | text and icons on indigo (white) | `text-primary-foreground` |
| `--nav` / `--nav-foreground` | floating dark pill bottom nav and its icons | `bg-nav`, `text-nav-foreground` |
| `--tile-amber`, `--tile-green`, `--tile-blue`, `--tile-violet` | pastel icon tile backgrounds | `bg-tile-amber`, ... |
| `--tile-*-foreground` | icon colour on the matching tile | `text-tile-amber-foreground`, ... |
| `--shadow-card` | soft diffuse shadow for cards and floating chips | `shadow-card` |

- `body` paints a `linear-gradient` from `--background-from` to `--background-to` (top to bottom, spanning the full page height, not fixed to the viewport) over the `--background` fallback.
- Cards use `rounded-3xl` (24px); chips, buttons and the nav are `rounded-full` pills.
- Dark mode follows `prefers-color-scheme` only (the `:root` overrides in the media query); there is no class-based toggle.
- One primary (indigo) CTA per screen: only the main action is an indigo-filled `Button`. Selected chips and the active nav tab are the only other `bg-primary` uses.
- Contrast targets: body text ≥ 7:1, secondary text and text on indigo ≥ 4.5:1, tile icons ≥ 3:1 on their tile, in both themes. `src/app/design-tokens.test.ts` checks them; keep it passing when you change a token.
- Primitives in `src/components/ui/` — reuse these before writing new UI:
  - `Card` — white rounded-3xl container with `shadow-card`; `as` picks the element (`div`, `li`, `section`).
  - `Chip` — pill toggle button with `selected` (`aria-pressed`).
  - `SegmentedControl` — row of chips picking one of N options (`radiogroup`); client component.
  - `IconButton` — round white button; required `label` becomes `aria-label`.
  - `Button` — indigo pill CTA with a white circular arrow badge; full width on phones, content width (min 20rem) from `md` up; defaults to `type="button"`.
  - `BottomNav` — floating dark pill nav of `next/link` tabs with `activeHref`; its type allows **at most 4 tabs**. Mobile only: hidden from `lg` up, where screens use a top nav.
  - `icons.tsx` — inline SVG icons.
- Icons are inline SVG using `currentColor` (in `icons.tsx`); no icon library. Mark them `aria-hidden="true"` when text names the control.
- Hero and decorative art is CSS and inline SVG only: no raster images, `<img>` or `next/image`. Wrap it in `aria-hidden="true"` with no focusable elements.
- `tap-target` utility gives `min-height`/`min-width` of 2.75rem (44px); put it on every interactive element.
- `font-sans` is Inter (default body font). `font-arabic` is Noto Naskh Arabic; use it with `lang="ar" dir="rtl"` on Arabic text.
