# Backlog

`/factory next` builds the first unchecked item and checks it off with its job id.
Every item implements part of `.plans/umrohhub-mvp-spec.md`; read the matching section there.

- [ ] Design foundation: replace the default Next.js page and styles with UmrohHub's design tokens (warm sand/ink light theme, charcoal dark theme via prefers-color-scheme, single gold accent), Inter + Noto Naskh Arabic fonts, 44px minimum tap targets, and a mobile-first landing page in Bahasa Indonesia that explains the app and has one "Masuk dengan Google" CTA (button only, no auth yet)
- [ ] i18n: Bahasa Indonesia (default) and English with a language toggle in the header, all existing UI copy moved into message files, choice persisted in a cookie
- [ ] Google sign-in with Supabase Auth: the landing CTA starts Google OAuth, /auth/callback exchanges the code, middleware refreshes the session, every route except / and /auth/* redirects signed-out users to /, and a signed-in header shows the user's name, avatar and a sign-out button
- [ ] Database schema migration for the MVP data model in the spec (preparation_steps, city_cost_overrides, trips, travelers, trip_step_config, trip_step_progress) with RLS so users only read and write their own trips; preparation_steps and city_cost_overrides are readable by any signed-in user
- [ ] Seed migration with the full preparation-step content from the spec (all timeline phases and categories, Bahasa Indonesia and English titles, summaries and detail markdown, dependencies, shared/individual default, IDR cost ranges, city cost overrides for flights from Jakarta, Surabaya, Medan, Makassar and Yogyakarta)
- [ ] Onboarding wizard for first-time signed-in users: departure city, travel month/year, passport status, number of travelers with names, disability and minor flags; on finish it creates the trip and travelers and lands on the trip page; users who already have a trip skip it
- [ ] Trip checklist page /trips/[id]: steps grouped by timeline phase then category, each step an accordion with summary, estimated cost and a status control (not started / in progress / done), overall progress bar at the top
- [ ] Step detail page /steps/[id]: full guide markdown rendered safely, prerequisites, cost range adjusted for the trip's departure city, and a link back to the checklist; checklist accordions get a "Pelajari lebih lanjut" link to it
- [ ] Hybrid step dependencies: marking a step done while a prerequisite is not done shows a non-blocking warning naming the prerequisite, and blocked steps are visually marked in the checklist
- [ ] Per-traveler tracking: trip owner can switch each step between shared and individual; individual steps show one status control per traveler and count toward progress per traveler
- [ ] Multi-trip dashboard /dashboard: list of the user's trips with progress, create a new trip via a short wizard, rename and delete a trip with confirmation; signed-in users land here
- [ ] Budget page /trips/[id]/budget: per-step and per-phase cost ranges multiplied by traveler count where individual, total min–max in IDR, and the "harga perkiraan, dapat berubah" disclaimer
- [ ] In-app notifications: deadline reminders generated from the travel date and step timeline phases, a bell with unread count in the header, and a /notifications page to read and mark them read
- [ ] Step comments: signed-in users can post and delete their own tips on a step detail page, newest first, with display name and avatar; requires a migration with RLS
- [ ] Content flagging: a "Laporkan info usang" button on each step detail page that records a reason in a content_flags table (migration with RLS, users can only insert and read their own flags)
