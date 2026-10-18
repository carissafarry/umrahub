# UmrohHub — MVP Product Specification

## Overview

**UmrohHub** is an interactive web platform that guides Indonesian pilgrims through the complete Umrah preparation process. Phase 1 focuses on a personalized, step-by-step preparation checklist with progress tracking. Future phases expand into a travel agent marketplace with maps, reviews, and booking integrations.

**Problem Statement:**
Indonesians wanting to perform independent (mandiri) Umrah face an opaque, fragmented preparation process. They don't know what steps to take, in what order, or what each step costs — leading to confusion, missed requirements, or falling victim to fraudulent agents.

**Target Market:** Indonesian pilgrims (Bahasa Indonesia primary, English secondary)

---

## Business Model

| Phase | Model | Revenue |
|-------|-------|---------|
| 1 (MVP) | Free | None — growth and validation |
| 2 | Freemium | Premium features (cost tracking, document reminders, personalized timeline) |
| 3 | Agent Marketplace | Commission from travel agent listings and referrals |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router) — mobile-first responsive web |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) |
| Auth | Google OAuth via Supabase Auth |
| Hosting | Vercel (frontend) + Supabase (backend) |
| i18n | Bahasa Indonesia (default) + English toggle |
| Future Native | Capacitor or React Native wrapper for Play Store / App Store |

---

## Core Features (Phase 1 — MVP)

### 1. Authentication

- **Google OAuth only** (via Supabase Auth)
- **No guest mode** — sign-in required to access the app
- Login redirects to dashboard or onboarding wizard (first-time users)

### 2. Onboarding Wizard

Multi-step questionnaire presented on first login. Generates a personalized Umrah preparation checklist.

**Wizard Fields:**
- Departure city (dropdown of major Indonesian cities)
- Approximate travel date (month/year picker)
- Passport status: have valid / have but expired / don't have
- Number of travelers
- Any travelers with disabilities? (yes/no + details if yes)
- Any travelers who are infants/minors (balita/di bawah umur)? (yes/no + count)

**Output:** Personalized timeline-based checklist with estimated costs and step dependencies.

### 3. Personalized Preparation Checklist

The core feature. Organized as **timeline phases with category groupings** within each phase.

#### Structure: Timeline → Categories → Steps

```
Phase: 3-6 Months Before Departure
├── Documents
│   ├── Apply for / renew passport
│   ├── Prepare passport photos (specific requirements)
│   └── Gather supporting documents (KTP, KK, etc.)
├── Health
│   ├── Meningitis vaccination (required)
│   └── General health check-up
└── Financial
    └── Set budget and start saving

Phase: 2-3 Months Before
├── Documents
│   ├── Apply for Saudi Umrah visa
│   └── Prepare travel insurance
├── Booking
│   ├── Book flights (Jeddah or Madinah)
│   └── Book accommodation
└── Financial
    └── Exchange currency (SAR)

Phase: 1 Month Before
├── Preparation
│   ├── Purchase ihram clothing and supplies
│   ├── Pack essentials checklist
│   └── Study basic manasik / rituals
└── Documents
    └── Verify all documents are ready

Phase: 1 Week Before
├── Final Checks
│   ├── Confirm flight and hotel bookings
│   ├── Print/download all documents
│   └── Notify family / set up communication plan
└── Spiritual
    └── Attend manasik briefing (if available locally)

Phase: Day of Departure
├── Checklist
│   ├── Final packing check
│   ├── Airport arrival and check-in
│   └── Documents carry-on verification
```

#### Step Detail Levels

Each step has two levels of detail:

1. **Inline Summary** (accordion expand): Quick overview, estimated cost, current status, key tips
2. **Full Detail Page** (linked): Complete guide with:
   - Detailed instructions
   - Required documents / prerequisites
   - Estimated cost range (from manual price data per departure city)
   - Tips from experienced pilgrims
   - Links to relevant services
   - Community comments/tips section

#### Step Dependencies (Hybrid Model)

- Steps show **recommended order** with visual dependency arrows
- **Warnings** when marking a step complete out of order (e.g., "Visa application typically requires a valid passport — are you sure?")
- **No hard locks** — users can check off anything, but get visual feedback if something looks out of sequence

### 4. Multi-Trip Support

- Users can create **multiple trip plans** (e.g., own trip + helping a parent)
- Each trip has its own:
  - Travel date
  - Traveler list
  - Checklist with independent progress
- **Per-traveler tracking** within a trip:
  - Trip creator can configure which checklist items are **shared** (e.g., flight booking) vs. **individual** (e.g., passport, vaccination)
  - Individual items tracked separately per traveler
  - Shared items checked once for the whole group

### 5. Cost Estimation

- **Phase 1:** Manual price ranges maintained by admin team
  - Per departure city where data varies (flights)
  - Fixed costs shown as ranges (visa fee, vaccination, etc.)
  - Disclaimer: "Harga perkiraan, dapat berubah" / "Estimated prices, subject to change"
- **Future:** Integration with flight/hotel APIs (Skyscanner, Traveloka affiliate, etc.)
- **Display:** Per-step cost estimate + running total budget tracker

### 6. In-App Notifications

- Deadline reminders based on travel date (e.g., "3 months until departure — passport renewal takes 2-4 weeks")
- Step completion suggestions
- Content update notifications
- **No email or push notifications in MVP** — in-app notification center only

### 7. Community Features

- **Per-step comments/tips** — users can share experiences and advice on individual preparation steps
- **Content flagging** — users can report outdated information for admin review
- Comments are public, tied to user's display name (from Google profile)
- Basic moderation: admin can hide/delete inappropriate comments

### 8. Internationalization (i18n)

- **Default:** Bahasa Indonesia
- **Toggle:** English (accessible from app header/settings)
- **Islamic terms:** Context-dependent approach:
  - Well-known terms stay in Arabic: tawaf, ihram, sa'i, du'a, wudhu
  - Less common terms: translated with Arabic in parentheses on first mention
  - Tooltips for Arabic terms explaining meaning

---

## Admin CMS (Separate Application)

Separate Next.js application for content management. Deployed independently.

### Features:
- **Step/guide content CRUD** — create, edit, reorder preparation steps and their detail pages
- **Price data management** — update cost estimates per city/category
- **Role-based access:** Admin (full access) + Editor (content only)
- **Community moderation** — review flagged content, manage comments
- **Content versioning** — track changes to steps/guides
- **2-3 team members** initially

### Tech:
- Next.js + Supabase (same Supabase project, different app)
- Supabase RLS policies for admin role enforcement
- Deployed on Vercel (separate project)

---

## Design Direction

### Visual Style
- **Clean & modern** — minimal, lots of whitespace
- Inspired by **Taj ul Huda** case study: premium, calm, trustworthy
- Also draws from **Traveloka/Tiket** familiarity but more refined
- **Light mode default** (daytime use primary), dark mode supported

### Design Principles (from Taj ul Huda reference):
- **44px minimum tap targets** — many users are older or less tech-savvy
- **High contrast** — readable in bright daylight (outdoor use in Saudi Arabia)
- **Gold accent color** for active states and CTAs — one gold element per screen so next action is always obvious
- **Maximum 4 main navigation tabs** — keep navigation dead simple
- **"Calm for a nervous first-timer"** — the app should feel reassuring, not overwhelming

### Color Palette Direction
- Primary background: warm off-white (light) / deep charcoal (dark)
- Accent: gold/amber for CTAs and active states
- Text: high-contrast dark on light / light on dark
- Status colors: green (complete), amber (in progress), gray (not started), red (warning/overdue)

### Typography
- Clean sans-serif (Inter or similar)
- Arabic text: Noto Naskh Arabic or similar readable Arabic font
- Large body text (16px minimum) for readability

### Layout
- Mobile-first responsive
- Bottom navigation bar (mobile)
- Card-based step display
- Progress visualization (progress bar or stepper for overall journey)

---

## Data Model (Supabase/PostgreSQL)

### Core Tables

```
users
├── id (uuid, PK — from Supabase Auth)
├── display_name (text)
├── avatar_url (text)
├── preferred_language (enum: 'id' | 'en')
├── created_at
└── updated_at

trips
├── id (uuid, PK)
├── user_id (FK → users)
├── name (text — e.g., "Umroh Keluarga 2027")
├── planned_departure_date (date)
├── departure_city (text)
├── has_disabilities (boolean)
├── has_minors (boolean)
├── disability_notes (text, nullable)
├── status (enum: 'planning' | 'in_progress' | 'completed')
├── created_at
└── updated_at

travelers
├── id (uuid, PK)
├── trip_id (FK → trips)
├── name (text)
├── is_minor (boolean)
├── has_disability (boolean)
├── notes (text, nullable)
├── created_at
└── updated_at

preparation_steps (CMS-managed)
├── id (uuid, PK)
├── phase_key (text — e.g., '3_6_months_before')
├── category_key (text — e.g., 'documents')
├── title_id (text — Bahasa Indonesia)
├── title_en (text — English)
├── summary_id (text)
├── summary_en (text)
├── detail_content_id (text/markdown)
├── detail_content_en (text/markdown)
├── estimated_cost_min (integer, nullable — in IDR)
├── estimated_cost_max (integer, nullable — in IDR)
├── cost_varies_by_city (boolean)
├── is_shared_step (boolean — default shared or individual)
├── dependency_step_ids (uuid[], nullable)
├── sort_order (integer)
├── is_published (boolean)
├── created_at
└── updated_at

city_cost_overrides
├── id (uuid, PK)
├── step_id (FK → preparation_steps)
├── city (text)
├── cost_min (integer)
├── cost_max (integer)
└── updated_at

trip_step_progress
├── id (uuid, PK)
├── trip_id (FK → trips)
├── step_id (FK → preparation_steps)
├── traveler_id (FK → travelers, nullable — null = shared step for whole trip)
├── status (enum: 'not_started' | 'in_progress' | 'completed')
├── completed_at (timestamp, nullable)
├── notes (text, nullable)
└── updated_at

trip_step_config
├── id (uuid, PK)
├── trip_id (FK → trips)
├── step_id (FK → preparation_steps)
├── tracking_mode (enum: 'shared' | 'individual')
└── updated_at

step_comments
├── id (uuid, PK)
├── step_id (FK → preparation_steps)
├── user_id (FK → users)
├── content (text)
├── is_flagged (boolean)
├── is_hidden (boolean)
├── created_at
└── updated_at

content_flags
├── id (uuid, PK)
├── step_id (FK → preparation_steps)
├── user_id (FK → users)
├── reason (text)
├── status (enum: 'pending' | 'reviewed' | 'resolved')
├── created_at
└── updated_at

notifications
├── id (uuid, PK)
├── user_id (FK → users)
├── trip_id (FK → trips, nullable)
├── type (text — e.g., 'deadline_reminder', 'content_update')
├── title_id (text)
├── title_en (text)
├── body_id (text)
├── body_en (text)
├── is_read (boolean)
├── created_at
└── read_at (timestamp, nullable)

admin_users
├── id (uuid, PK)
├── user_id (FK → users)
├── role (enum: 'admin' | 'editor')
├── created_at
└── updated_at
```

---

## User Flows

### Flow 1: New User Onboarding
```
Landing Page → Sign in with Google → Onboarding Wizard (5-6 steps) →
Personalized checklist generated → Dashboard with first trip
```

### Flow 2: Returning User
```
Sign in with Google → Dashboard → Select trip → View/update checklist progress
```

### Flow 3: Creating Additional Trip
```
Dashboard → "New Trip" → Mini wizard (date, city, travelers) → New checklist generated
```

### Flow 4: Step Completion
```
Checklist → Expand step (inline summary) → Mark as complete OR
Checklist → Click "Learn more" → Full detail page → Read guide → Mark complete → Back to checklist
```

### Flow 5: Community Interaction
```
Step detail page → Scroll to comments → Read tips from others → Add own tip/experience
```

---

## Pages / Routes

### User-Facing App
| Route | Description |
|-------|-------------|
| `/` | Landing page (public — app overview, CTA to sign in) |
| `/auth/callback` | Google OAuth callback handler |
| `/dashboard` | User's trips overview, active trip checklist summary |
| `/trips/new` | New trip creation wizard |
| `/trips/[id]` | Trip detail — full checklist with progress |
| `/trips/[id]/travelers` | Manage travelers in trip |
| `/trips/[id]/budget` | Cost breakdown and budget tracker |
| `/steps/[id]` | Step detail page (full guide + comments) |
| `/settings` | User preferences (language, profile) |
| `/notifications` | Notification center |

### Admin CMS (Separate App)
| Route | Description |
|-------|-------------|
| `/admin` | Dashboard — content stats, flagged items |
| `/admin/steps` | Manage preparation steps |
| `/admin/steps/[id]` | Edit step content and pricing |
| `/admin/costs` | Manage city-specific cost overrides |
| `/admin/comments` | Moderate community comments |
| `/admin/flags` | Review content flags |
| `/admin/users` | Manage admin/editor roles |

---

## Phase 1 MVP Scope (1-2 Weeks)

### Must Have (Week 1-2)
- [x] Next.js project setup with Supabase integration
- [x] Google OAuth authentication
- [x] Onboarding wizard
- [x] Checklist generation from wizard answers
- [x] Timeline + category organized checklist view
- [x] Step inline summary (accordion expand)
- [x] Step detail page with full guide content
- [x] Progress tracking (mark steps complete/in-progress)
- [x] Hybrid dependency warnings
- [x] Multi-trip support (create, switch, delete trips)
- [x] Per-traveler tracking with shared/individual step config
- [x] Cost estimates per step + total budget view
- [x] Bahasa Indonesia + English toggle
- [x] Mobile-first responsive design
- [x] Landing page

### Nice to Have (if time permits)
- [ ] In-app notifications for deadline reminders
- [ ] Community comments on steps
- [ ] Content flagging
- [ ] Admin CMS (can use Supabase Studio initially)
- [ ] Dark mode

---

## Future Phases (Post-MVP)

### Phase 2 — Enhanced Experience
- Manasik/ritual interactive map (jalur manasik)
- Food and souvenir recommendations near Masjidil Haram
- User reviews on locations/recommendations
- Push notifications (web + future mobile)
- PWA with offline checklist access
- Downloadable PDF of personalized checklist
- AI-powered Q&A about Umrah preparation

### Phase 3 — Agent Marketplace
- Travel agent profiles with company info and services
- Agent service listings (visa assistance, group packages, etc.)
- User reviews and ratings for agents
- Verified agent badges (prevent fraud)
- Agent dashboard for managing their listings
- Commission-based revenue model

### Phase 4 — Native Mobile
- React Native or Capacitor wrapper
- Play Store and App Store publication
- GPS-based manasik tracking (like Taj ul Huda reference)
- Offline-first architecture
- Live du'a guidance based on location

---

## Design Reference

**Primary Inspiration:** Taj ul Huda (case study)
- Premium dark/gold aesthetic
- Elder-friendly: 44px tap targets, 12:1 contrast ratio
- One gold active state per screen
- Calm, reassuring tone
- Light by day, dark by night

**Secondary Inspiration:** Traveloka / Tiket.com
- Familiar Indonesian travel app patterns
- But more modern and refined

---

## Non-Functional Requirements

- **Performance:** Lighthouse score > 90 on mobile
- **Accessibility:** WCAG 2.1 AA minimum (large tap targets, high contrast, screen reader support)
- **SEO:** Landing page and step detail pages should be SSR for discoverability
- **Security:** Supabase RLS on all tables, no client-side admin access
- **Data Privacy:** Minimal personal data collection, no passport/document storage in MVP
- **Scalability:** Supabase free tier supports initial growth; upgrade path clear

---

*Spec generated from interview on 2026-10-18*
*Design reference: Taj ul Huda case study (Unbland Studio)*
