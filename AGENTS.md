# Umra Hub

Brand name: **Umra Hub** — with a space — in every user-facing text (UI, metadata, copy, alt text). Use `umrahub` (lowercase, no space) for identifiers, package names and domains. The old name "UmrohHub" is retired; folder and file names that still contain it are only historical.

Worship term: always **"Umrah"** — in Indonesian and English copy, seed content, tests and docs. Never "Umroh". ("Umra Hub" is the brand; "Umrah" is the pilgrimage.)

Mobile-first web app guiding Indonesian pilgrims through independent (mandiri) Umrah preparation.
Product spec: `.plans/umrohhub-mvp-spec.md` — read it before building any feature.
Scope now: user-facing app only. Admin CMS is out of scope; content is edited via Supabase Studio.

## Stack

- Next.js 15 (App Router, TypeScript, `src/` dir, `@/*` import alias), React 19
- Tailwind CSS v4 (`src/app/globals.css`, no tailwind.config file)
- Supabase via `@supabase/ssr`: browser client `src/lib/supabase/client.ts`, server client `src/lib/supabase/server.ts`
- `next-intl` for i18n, without i18n routing (see i18n)
- Vitest for unit tests (`*.test.ts` next to the code)
- Node 20, npm (never pnpm/yarn — `package-lock.json` is the lockfile)

## Important paths

- `src/app/` — routes (App Router)
- `src/components/ui/` — shared UI primitives (see Design system)
- `src/lib/` — shared helpers
- `src/lib/auth/` — auth Server Actions, public-path check, user profile mapping (see Auth)
- `src/lib/onboarding/` — onboarding wizard validation and trip creation (see Onboarding)
- `src/middleware.ts` — auth session refresh and route protection (see Auth)
- `src/lib/trips/` — trip checklist logic (grouping, progress, costs), page data loader and the `updateStepStatus` Server Action (see Trip checklist)
- `src/components/trips/` — trip checklist UI (step accordion, progress card)
- `src/lib/steps/` — step detail data loader and the safe guide-markdown parser (see Step detail)
- `src/components/steps/` — step detail page body and the `GuideMarkdown` renderer
- `src/lib/dashboard/` — trip dashboard loader, per-trip progress summary, trip-name rules and the `renameTrip` / `deleteTrip` Server Actions (see Dashboard)
- `src/components/dashboard/` — dashboard trip card and its rename/delete dialogs (see Dashboard)
- `src/i18n/` — next-intl setup: locales (`config.ts`), request config (`request.ts`), language Server Action (`actions.ts`)
- `messages/` — UI copy: `id.json` and `en.json`
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
- Preparation-step content is seeded by `supabase/migrations/20261018150410_seed_preparation_steps.sql`:
  - Step ids are fixed: `5eed0000-0000-4000-8000-0000000000NN` (`NN` = step 01–22); `sort_order` is `NN * 10`.
  - `phase_key` in order: `3_6_months_before`, `2_3_months_before`, `1_month_before`, `1_week_before`, `departure_day`.
  - `category_key`: `documents`, `health`, `financial`, `booking`, `preparation`, `final_checks`, `spiritual`, `checklist`.
  - `city_cost_overrides.city` spellings: `Jakarta`, `Surabaya`, `Medan`, `Makassar`, `Yogyakarta`. The wizard's departure-city values must match them exactly.
  - All costs are per person, in whole rupiah (IDR). Flights (09), accommodation (10) and confirming those bookings (16) are individual steps (`is_shared_step = false`), so the budget multiplies them by traveler count.
  - Copy spells the pilgrimage "Umrah" in both Indonesian and English, never "Umroh".
  - Content changes after merge go in a new upsert migration (or Studio); never edit this one.

## Trip checklist

- `/trips/[id]` (`src/app/trips/[id]/`) loads through `loadTripChecklist` in `src/lib/trips/queries.ts`: signed out → `/`, a non-UUID id or a trip RLS doesn't return → `notFound()`.
- A step's status lives in its trip-level `trip_step_progress` row (`traveler_id` null). A missing row means `not_started`; progress is `completed` steps ÷ all published steps.
- Status writes go only through `updateStepStatus` in `src/lib/trips/actions.ts`, which validates input, re-checks trip ownership and upserts on `trip_id,step_id,traveler_id`.
- Costs use the `city_cost_overrides` row whose `city` equals `trips.departure_city` exactly, else the step's own range; they are shown per person.
- Ordering is by `sort_order` only: phases and categories by their smallest `sort_order`, steps by `sort_order` then `id`. Phase and category labels are `Checklist.phases.*` / `Checklist.categories.*`; an unknown key shows the raw key.

## Step detail

- `/steps/[id]?trip=<tripId>` (`src/app/steps/[id]/`) loads through `loadStepDetail` in `src/lib/steps/queries.ts`: signed out → `/`, a non-UUID id or a step that isn't published → `notFound()`. A `trip` param that isn't a UUID or that RLS doesn't return is treated exactly like no trip, so the page never reveals whether a trip exists.
- Costs, overrides and statuses reuse `src/lib/trips/checklist.ts`; never duplicate that logic.
- **Database markdown is rendered only through `GuideMarkdown`** (`src/components/steps/GuideMarkdown.tsx`, parser `src/lib/steps/markdown.ts`): raw HTML is shown as literal text, only `https:` links become anchors (new tab, `rel="noopener noreferrer"`), and all text goes in as React children. Never use `dangerouslySetInnerHTML`, `innerHTML`, a raw-HTML plugin such as `rehype-raw`, or a markdown library for it. Supported syntax: `#`/`##` (h2), `###`+ (h3), paragraphs, `1.` / `-` / `*` lists with one nested level, `**bold**`, `[text](https://...)`.

## Conventions

- **Most important rule: no AI attribution in git.** Never add `Co-Authored-By: Claude …`, "Generated with Claude Code" or any AI co-author/trailer to a commit, merge commit, amend or PR description.

- Every commit message is `<type>-<NNN> <message>`: the backlog task code, a space, then the message, no brackets (e.g. `fe-002 Add Card primitive`). Type is `infra`, `be` or `fe`. Every commit belongs to a backlog task — tooling and factory work gets an `infra-NNN` task first; there are no untagged commits.
- Job branches are `factory/<type>-<NNN>` (e.g. `factory/fe-004`).
- Pull request titles: job PRs are `Merge PR #<N> from /factory/<job-id>` (e.g. `Merge PR #12 from /factory/fe-009`); the infra PR appends its task codes: `Merge PR #<N> from /factory/infra: infra-030, infra-029`. No owner prefix. The repo uses the PR title as the merge commit title, so PR merges read like GitHub's own merge commits (with `#N` auto-linked on the web) and ordinary commits stay `<task code> <message>`.
- **Never commit on `main`** (not even the local ref): it only mirrors `origin/main`. Infra, tooling and factory changes all go on the single long-lived branch `factory/infra` — commit messages still carry the task code (`infra-NNN <message>`) — and reach `main` through one PR from `factory/infra` that the user merges.
- **The software factory resumes by itself whenever a session starts or resumes.** The `SessionStart` hook (`.claude/settings.json`) runs `factory/resume-check.sh`; the orchestrator then re-arms `factory/watch.sh`, processes dashboard requests, handles PRs merged while it was away and restarts interrupted jobs (`/factory resume` in `.claude/skills/factory/SKILL.md`). Job state lives on disk and in git/GitHub, never only in a session.

- Mobile-first; minimum 44px tap targets; high contrast; one primary (indigo) CTA per screen.
- UI copy in Bahasa Indonesia by default; all user-facing strings go through i18n (see below).
- Responsive for web and mobile: build mobile-first, then give every screen a real desktop layout at `lg` (≥ 1024px) — wider container (max ~1200px), multi-column grids, hero text beside its illustration, top nav instead of BottomNav. A phone-width column centred on desktop is a bug. Check every UI change at 390px, 768px and 1280px.
- Server Components by default; add `"use client"` only where interactivity needs it.
- Every Supabase table gets RLS policies. Never use or commit the service-role key.
- Never commit `.env*` files except `.env.example`.

## i18n

- Locales are `id` (default) and `en`. The active locale comes from the `NEXT_LOCALE` cookie (unknown or missing → `id`); `Accept-Language` is ignored. There are no per-locale URLs and no `[locale]` segment. `src/middleware.ts` exists for auth session refresh only and does no locale handling.
- To add copy, add the key to **both** `messages/id.json` and `messages/en.json`, grouped by namespace (`Metadata`, `Header`, `Home`, `Footer`, ...). Use `getTranslations` from `next-intl/server` in Server Components and `useTranslations` from `next-intl` in Client Components. `src/i18n/messages.test.ts` fails if the two files' keys differ.
- Spelling: the pilgrimage is "Umrah" in both languages (see Worship term above). The brand "Umra Hub" is never translated. Arabic text stays untranslated with `lang="ar" dir="rtl"`.
- The root layout renders `SiteHeader` (wordmark + language toggle, plus the user block when signed in) on every page. New pages get the header automatically and must not render their own `<header>`.

## Auth

- Google OAuth only, via Supabase Auth. Sign-in and sign-out are Server Actions in `src/lib/auth/actions.ts` (`signInWithGoogle`, `signOut`). The OAuth `redirectTo` is `<request origin>/auth/callback`, derived from the request headers (no env var).
- `src/app/auth/callback/route.ts` exchanges the code for a session and redirects to `/dashboard`; any failure redirects to `/?auth_error=1`.
- `src/middleware.ts` (via `updateSession` in `src/lib/supabase/middleware.ts`) refreshes the session cookies (with no-store cache headers) and redirects signed-out users to `/` for every matched path except `/` and `/auth/*`. This redirect is UX, not the security boundary: the matcher skips `/_vercel/*` and any path ending in an image extension (`.png`, `.svg`, ...), so protected pages and Route Handlers must still check `getUser()` server-side, and data access relies on RLS. A page that must be public needs `isPublicPath` in `src/lib/auth/paths.ts` changed.
- Read the user in server code with `createClient()` from `src/lib/supabase/server.ts` + `supabase.auth.getUser()`; never trust `getSession()` alone. Profile data (name, avatar) comes from `user_metadata` via `getUserProfile` in `src/lib/auth/profile.ts`.
- Without Supabase env values the middleware and header treat everyone as signed out.
- The Supabase project's Redirect URLs allow-list must include `<origin>/auth/callback` for every deploy origin (localhost, Vercel previews, production); keep entries to exact origins or narrowly scoped preview patterns, never a bare `**`.

## Onboarding

- `/onboarding` (`src/app/onboarding/`) is the 5-step wizard for signed-in users with no trip: city, travel month/year, passport status, travelers, special needs. The page and the Server Action both check `getUser()` and redirect a user who already owns a trip to `/dashboard`; a first trip's successful submit opens `/trips/<new id>`. Nothing is saved until the final submit.
- `OnboardingWizard` takes `variant: "onboarding" | "newTrip"`. `/trips/new` reuses it as `newTrip` (heading and intro from `Dashboard.newTrip.*`, submits to `createAdditionalTrip` in `src/app/trips/new/actions.ts`); never copy its steps or validation. Both actions name the trip with `defaultTripName` (`src/lib/onboarding/tripName.ts`).
- Validation lives in `src/lib/onboarding/validate.ts` (`parseOnboardingInput`, no library; its rules are shared with the client): 1–10 travelers, names 1–80 chars after trim, disability notes ≤ 500 chars (dropped when nobody has a disability), month from the current month through +24 months (server clock). Errors are fixed codes and never echo input.
- Writes are in `createOnboardingTrip` (`src/lib/onboarding/createTrip.ts`, takes the cookie-bound anon client): the trip (no `user_id`, left to `auth.uid()`), then its travelers; if a later insert fails the trip is deleted. Logs are a fixed string plus `error.code` only.
- The passport answer is not stored. `valid` marks step 01 (`5eed0000-…-000000000001`) completed for every traveler; `expired`/`none` write nothing.
- City values are exactly the 5 `city_cost_overrides` cities: `Jakarta`, `Surabaya`, `Medan`, `Makassar`, `Yogyakarta`.

## Dashboard

- Signed-in users land on `/dashboard` (`src/app/dashboard/`): the OAuth callback, `/` (when Supabase env is set and `getUser()` returns a user) and `/onboarding` (for users who own a trip) all redirect there. `/dashboard` redirects signed-out users to `/` and users with no trips to `/onboarding`, so there is no empty state; deleting the last trip leads to onboarding.
- `loadDashboard` (`src/lib/dashboard/queries.ts`) selects only `id, name, departure_city, planned_departure_date` of the user's trips (newest first), the published steps once and trip-level progress (`traveler_id` null) of all those trips in one `.in("trip_id", …)` query. It never loads travelers or the disability/minor fields. Errors throw a generic `Error`; `src/app/dashboard/error.tsx` shows a calm retry card.
- Per-trip progress is `summarizeTrips` (`src/lib/dashboard/summary.ts`), which groups rows by `trip_id` and calls `computeProgress`; never re-implement the counting, so the dashboard matches `/trips/[id]`.
- `renameTrip` and `deleteTrip` (`src/lib/dashboard/actions.ts`) validate (`isUuid`, `parseTripName`: trimmed, 1–80 chars, duplicates allowed), call `getUser()`, re-check ownership with `.eq("id").eq("user_id", user.id).maybeSingle()`, then write filtered by both `id` and `user_id` and `revalidatePath("/dashboard")`. Delete relies on the `on delete cascade` of travelers, config and progress. Logs are a fixed string plus `error.code` only.
- Both are confirmed in modal `<dialog>`s in `src/components/dashboard/TripActions.tsx` (the only client component on the page); delete is a `role="alertdialog"` with Cancel focused first and an ink-filled (`bg-foreground text-background`) destructive button, never indigo.
- Trip cap: `maxTripsPerUser` = 10 (`src/lib/dashboard/validate.ts`), enforced at app level only, in `createAdditionalTrip` (returns `{ error: "limit" }`); at the cap the dashboard shows `Onboarding.errors.limit` instead of the CTA. There is no DB-level cap.
- Navigation tabs live in one list in `src/components/AppNav.tsx` (`/dashboard`, `/trips/new`), used by `AppBottomNav` (mobile) and `AppTopNav` (in `SiteHeader` for signed-in users, `hidden lg:flex`, active tab is a non-indigo surface pill via `AppNavLink`). Add a tab only for a route that exists.
- Pages that render `AppBottomNav` pad their content below `lg` by at least `calc(7rem + env(safe-area-inset-bottom))` so the fixed nav never covers it (`lg:pb-16` from desktop up).

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
- Hero and decorative art is CSS and inline SVG only: no raster images, `<img>` or `next/image` (the only `<img>` is the signed-in user's remote avatar in `UserMenu`, which is user content). Wrap it in `aria-hidden="true"` with no focusable elements.
- `tap-target` utility gives `min-height`/`min-width` of 2.75rem (44px); put it on every interactive element.
- `font-sans` is Inter (default body font). `font-arabic` is Noto Naskh Arabic; use it with `lang="ar" dir="rtl"` on Arabic text.
