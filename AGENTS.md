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

## Conventions

- Every commit message starts with its backlog task code: `<task-code>: <message>` (e.g. `002-design-refresh: Add Card primitive`). Commits not tied to a task use `chore: <message>`.

- Mobile-first; minimum 44px tap targets; high contrast; one gold accent CTA per screen.
- UI copy in Bahasa Indonesia by default; once i18n exists, all user-facing strings go through it.
- Server Components by default; add `"use client"` only where interactivity needs it.
- Every Supabase table gets RLS policies. Never use or commit the service-role key.
- Never commit `.env*` files except `.env.example`.

## Design system

Tokens are CSS variables in `src/app/globals.css`, mapped to Tailwind in `@theme inline`. New UI uses these tokens, never raw hex values or Tailwind palette colours (`bg-amber-500`, `text-gray-700`, ...).

| Token | Use | Utilities |
| --- | --- | --- |
| `--background` | page background (warm sand / charcoal) | `bg-background` |
| `--surface` | cards and sections | `bg-surface` |
| `--foreground` | primary ink text | `text-foreground` |
| `--muted` | secondary text | `text-muted` |
| `--border` | borders and dividers | `border-border` |
| `--accent` | gold, the only accent hue | `bg-accent` |
| `--accent-foreground` | text on gold | `text-accent-foreground` |

- Dark mode follows `prefers-color-scheme` only (the `:root` overrides in the media query); there is no class-based toggle.
- One gold element per screen: only the primary CTA uses `bg-accent`/`text-accent*`.
- `tap-target` utility gives `min-height`/`min-width` of 2.75rem (44px); put it on every interactive element.
- `font-sans` is Inter (default body font). `font-arabic` is Noto Naskh Arabic; use it with `lang="ar" dir="rtl"` on Arabic text.
