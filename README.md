# Multi-Event Check-In Platform

A reusable SaaS-style event check-in platform. Create unlimited events, build a custom registration form for each one, and run check-in day-of — all natively, no Google Sheets required.

---

## Architecture

```
organizations
   └── events (each event belongs to one org)
          ├── event_forms + form_fields   (your custom registration form)
          ├── registrants                 (one row per person, scoped to the event)
          └── event_staff                 (who can check people in for THIS event)

app_users
   ├── organization_members  (org-level role: owner/admin/staff)
   └── event_staff           (event-level role: event_admin/staff)
```

**Permission resolution for any event:**
1. `super_admin` (global) → full access to everything, everywhere
2. Member of the event's organization (owner/admin) → treated as event_admin
3. Explicit `event_staff` row for that event → event_admin or staff

**Registration flow:**
```
Public link (/register/:eventId) → submit_registration RPC → registrants table
                                                                      ↓
                                                          Realtime → live in the app
```

No Google Sheets, no Apps Script, no webhook — registrations go straight into Supabase the moment someone submits the form.

---

## Setup

### 1. Install
```bash
npm install
```

### 2. Supabase project
[supabase.com](https://supabase.com) → New project → **Settings → API** → copy Project URL + anon key.

### 3. Environment
```bash
cp .env.example .env
```
```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Run the SQL files — **in this exact order**

| Order | File | What it does |
|---|---|---|
| 1 | `supabase/schema.sql` | Tables, RLS, realtime. Update the seed email at the bottom to your own. |
| 2 | `supabase/rpc_functions.sql` | Auth, event access, staff management, organization/event creation |
| 3 | `supabase/forms_schema.sql` | Form builder + public registration tables and RPCs |
| 4 | `supabase/indexes.sql` | Performance indexes |

Run each one fully in Supabase → SQL Editor before moving to the next.

### 5. Enable Email (Magic Link)
Supabase → **Authentication → Providers → Email** → enable, turn on Confirm email.

### 6. Enable Realtime
Supabase → **Database → Replication** → toggle `registrants` ON.

### 7. Run locally
```bash
npm run dev
```
Sign in with the email you seeded as `super_admin` in step 4.

### 8. Deploy
```bash
npx vercel
```
Add the two env vars in Vercel → Settings → Environment Variables, then redeploy.

---

## How to run an event end-to-end

1. Sign in → lands on **Portal Command** (`/admin`) since you're super_admin
2. **Create Event** → pick an existing organization or create a new one inline
3. On the event card, click **Form** → design your registration form:
   - Toggle which standard fields show (Gender, Age, Phone, Province, Email) and whether each is required
   - Add custom fields (text, dropdown, multiple choice, checkboxes, date, etc.) — Google-Forms-style
   - Toggle **Registration is Open/Closed**
   - Save
4. Click **Link** to copy the public registration URL → share it however you like (WhatsApp, social, posters)
5. People fill out the form at `/register/:eventId` — no login needed on their end
6. Click **Staff** to add check-in staff or event admins for this event — they sign in with a magic link
7. Click **Open Dashboard** on event day — check-in, stats, and the full registrant list, all scoped to that one event

Staff/admins who aren't super_admin land on `/select-event` after login and pick from whichever events they've been added to.

---

## Project structure

```
src/
├── App.tsx                          ← full route tree, auth gate
├── hooks/
│   ├── useAuth.ts                   ← magic link, session resolution (RPC)
│   ├── useMyEvents.ts               ← events the signed-in user can access
│   └── useRegistrants.ts            ← event-scoped data + realtime patching
├── pages/
│   ├── LoginPage.tsx
│   ├── EventSelectPage.tsx          ← event picker for non-super-admins
│   ├── EventDashboardWrapper.tsx    ← resolves role for /event/:id on direct load
│   ├── Dashboard.tsx                ← check-in / stats / registrants tabs
│   ├── FormBuilderPage.tsx          ← Google-Forms-style builder
│   ├── PublicRegistrationPage.tsx   ← public, no auth — attendees fill this out
│   └── SuperAdminHub.tsx            ← create orgs/events, manage everything
└── components/
    ├── BottomNav.tsx
    ├── CheckInTab.tsx               ← memoized cards, paginated, debounced search
    ├── StatsTab.tsx
    ├── RegistrantsTab.tsx
    ├── EventStaffModal.tsx          ← add/remove staff for one event, share link
    └── CreateEventModal.tsx

supabase/
├── schema.sql            ← run 1st
├── rpc_functions.sql     ← run 2nd
├── forms_schema.sql      ← run 3rd
└── indexes.sql           ← run 4th

legacy-sheets-sync/        ← old Google Sheets sync (retired, kept for reference
                              only — not part of the active app)
```

---

## Common issues

**"This email is not registered"** — they're not in `app_users`. Add them via Staff/Create Event flows, or directly: `insert into app_users (email, name, role) values (...)`.

**`violates check constraint app_users_role_check`** — old constraint from before this schema:
```sql
alter table public.app_users drop constraint app_users_role_check;
alter table public.app_users add constraint app_users_role_check
  check (role in ('super_admin', 'admin', 'staff'));
```

**"No Access" on an event URL** — the signed-in user has no `event_staff` row and isn't in that event's organization. Add them via the event's **Staff** button.

**Registration form shows "Registration is not open"** — toggle "Registration is Open" in the Form Builder and Save.

**Migrating old GOC 2026 data from Google Sheets** — the legacy sync code is kept in `legacy-sheets-sync/` for reference. The simplest path is a one-time CSV export from the old sheet → manual insert into `registrants` with the correct `event_id`. Ask if you want a script for this.
