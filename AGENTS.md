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

## Validation

```bash
npx eslint <changed files>   # lint only files you changed
npm run typecheck
npm run test
npm run build
```

All four must pass before a change is ready.

## Database (Supabase)

- Schema lives in `supabase/migrations/`. Create a file with `supabase migration new <snake_case_name>`; never edit a migration that is already on `main`.
- Seed/reference content goes in its own migration (idempotent `insert ... on conflict do update`), not in `supabase/seed.sql`.
- Jobs never touch the remote database: no `supabase db push`, `supabase link` or SQL against the hosted project. A human applies migrations after merge.
- To check a migration runs, use the local stack if Docker is available: `supabase start` then `supabase db reset --local`. Stop it with `supabase stop` when done.
- Generated types: `supabase gen types typescript --local > src/lib/supabase/database.types.ts` (local stack only).

## Conventions

- Mobile-first; minimum 44px tap targets; high contrast; one gold accent CTA per screen.
- UI copy in Bahasa Indonesia by default; once i18n exists, all user-facing strings go through it.
- Server Components by default; add `"use client"` only where interactivity needs it.
- Every Supabase table gets RLS policies. Never use or commit the service-role key.
- Never commit `.env*` files except `.env.example`.
