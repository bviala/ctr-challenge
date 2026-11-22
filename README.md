## Assumptions

- A user can be admin xor student
- Signed-up user get the student role by default
- Assigning admin role to users through the Supabase Console is acceptable at this stage (PoC)
- A consultation is incomplete by default
- A student can mark a consultation complete or incomplete as many times as they like, before or after the scheduled consultation date

## Additional requirements

Arbitrary additional requirements (I was curious how to implement them with the stack).
- Consultations completion changes, reschedules and cancellations should be auditable.
- Admin can also mark complete, reschedule or cancel.
- User can add a free text note when completing, rescheduling or cancelling a consultation.

## Summary of implementation

- RBAC roles are stored in a custom profiles table to avoid stale token issues, provide better auditability and ease of update.
- Routes: `/student`, `/admin`, `/consultations/[id]`, `/api/consultations/*`, `/auth/*` (from template).
- Proxy (`lib/supabase/proxy.ts`): unauthenticated redirect, /api bypass, role-based routing (/, /student, /admin).
- Components: ConsultationList, AddConsultationDialog, ConsultationDetails, RescheduleConsultationDialog, ConsultationStatusDialog
- Data flow: 
  - read: client → GET API → RLS
  - write: client → POST API → RPC (→ trigger → events).
- Test examples: 
  - DB/RLS: `supabase/tests/consultations_rls.sql`
  - Component: `components/consultations/status-badge.test.tsx`
  - Unit: `lib/validation.test.ts`

## Database schema

Migrations live in `supabase/migrations/` and are applied with `supabase db push`.

### `profiles`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users(id)` `on delete cascade` |
| `email` | `text` | nullable (snapshot for admin views) |
| `role` | `text` | not null, default `'student'`, check `role in ('student', 'admin')` |
| `created_at` | `timestamptz` | not null, default `now()` |

### `consultations`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `student_id` | `uuid` | not null, FK → `profiles(id)` `on delete cascade` |
| `first_name` | `text` | not null |
| `last_name` | `text` | not null |
| `reason` | `text` | not null |
| `scheduled_at` | `timestamptz` | not null |
| `status` | `text` | not null, default `'scheduled'`, check `status in ('scheduled', 'completed', 'cancelled')` |
| `created_at` | `timestamptz` | not null, default `now()` |
| `updated_at` | `timestamptz` | not null, default `now()` |

### `consultation_events`

| Column | Type | Constraints |
|---|---|---|
| `id` | `bigint` | PK, generated always as identity |
| `consultation_id` | `uuid` | not null, FK → `consultations(id)` `on delete cascade` |
| `event_type` | `text` | not null, check `event_type in ('created', 'rescheduled', 'cancelled', 'completed', 'reopened', 'status_changed')` |
| `actor_id` | `uuid` | nullable, FK → `profiles(id)` `on delete set null` |
| `old_scheduled_at` | `timestamptz` | nullable |
| `new_scheduled_at` | `timestamptz` | nullable |
| `old_status` | `text` | nullable |
| `new_status` | `text` | nullable |
| `note` | `text` | nullable |
| `created_at` | `timestamptz` | not null, default `now()` |

### Relationships

- `consultations.student_id` → `profiles.id` (many-to-one)
- `consultation_events.consultation_id` → `consultations.id` (many-to-one)
- `consultation_events.actor_id` → `profiles.id` (many-to-one, nullable)

### Indexes

- `consultations_student_idx` on `(student_id, scheduled_at desc)`
- `consultations_status_idx` on `(status, scheduled_at)`
- `consultation_events_consultation_idx` on `(consultation_id, created_at)`

### Migrations

| Migration | Purpose |
|---|---|
| `20261121111757_user_profiles.sql` | `profiles` table, `handle_new_user` trigger, `is_admin()`, select-own-or-admin RLS |
| `20261121114004_profiles_grants.sql` | `select` grant on `profiles` to `authenticated` |
| `20261122001928_consultations.sql` | `consultations` + `consultation_events`, audit and `updated_at` triggers, RLS, mutation RPCs |
| `20261122025206_restrict_consultation_writes.sql` | revokes direct insert/update; adds `create_consultation`; makes the mutation RPCs `security definer` with explicit ownership checks |
| `20261122031033_restrict_is_admin_execute.sql` | restricts `is_admin()` execute to `authenticated` / `service_role` |

### Row-level security & grants

RLS is enabled on all three tables. `anon` is scoped out by the policies (no `auth.uid()`), and the app only ever uses the publishable key.

| Table | Policies | Grants |
|---|---|---|
| `profiles` | `profiles_select_own_or_admin`: own row, or any row when `is_admin()`. No insert/update/delete policies. | `select` to `authenticated`; rows are created by the `handle_new_user` trigger |
| `consultations` | `consultations_select`: own rows, or all rows when `is_admin()`. No insert/update/delete policies (revoked in the write-restriction migration). | `select` to `authenticated`; all writes go through the mutation RPCs |
| `consultation_events` | `consultation_events_select`: events of own consultations, or all when `is_admin()`. No write policies. | `select` to `authenticated`; writes only via the audit trigger |

`service_role` bypasses RLS and is reserved for server-side tooling; it is never exposed to the browser.

### Functions & triggers

| Function | Kind | Responsibility |
|---|---|---|
| `handle_new_user()` | trigger (`on_auth_user_created`) | creates the `profiles` row (`role = 'student'`) when an `auth.users` row is inserted |
| `set_updated_at()` | trigger (`consultations_set_updated_at`) | stamps `consultations.updated_at` on update |
| `log_consultation_change()` | trigger (`consultations_audit`) | appends the audit event on consultation insert/update |
| `is_admin()` | helper | backs the RLS policies |
| `create_consultation(...)` | RPC | inserts a consultation owned by `auth.uid()`; validates required fields and a future datetime |
| `reschedule_consultation(...)` | RPC | updates `scheduled_at` while `status = 'scheduled'`; requires a future datetime; owner or admin |
| `cancel_consultation(...)` | RPC | `scheduled → cancelled`; owner or admin |
| `complete_consultation(...)` | RPC | `scheduled → completed`; owner or admin |
| `reopen_consultation(...)` | RPC | `completed → scheduled`; owner or admin |

All mutation RPCs are `security definer` with `search_path = public`; execute is granted only to `authenticated` and `service_role`. Each sets `app.consultation_note` so the audit trigger records the free-text note atomically with the change.

## Future improvements
- Pagination
- API integration and E2E tests
- Responsive design
- Dedicated API project
  - Hexagonal architecture
  - Isolated and agnostic domain layer
  - Direct connection to DB
- Form control and validation libraries 
- Add a `supabase/seed.sql` for easier local dev

## Setup

### Prerequisites

- Node.js 20.9+
- Supabase CLI (migrations, type generation, local stack)
- Docker, only if you use the local Supabase stack

### 1. Database

Hosted project:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Local stack:

```bash
supabase start
supabase db reset   # applies supabase/migrations; also runs supabase/seed.sql if present
```

### 2. Environment

Copy `.env.example` to `.env.local`. The variable names are the same for both targets; only the values differ:

Hosted project (from **Project Settings → API**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable/anon key>
```

Local stack (from `supabase status`):

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<sb_publishable_XXXXXX>
```

### 3. Admin promotion

New users default to the `student` role. You can make a user admin from the Supabase Console SQL editor:

```sql
update public.profiles
set role = 'admin'
where email = 'user@example.com';
```

### 4. Types

Regenerate the Supabase types after any schema change:

```bash
npm run types:local    # local stack (requires supabase start)
npm run types:remote   # linked project (requires supabase login + supabase link)
```

### 5. Run

```bash
npm install
npm run dev
```

### 6. Tests

```bash
npm test          # Vitest: unit + component
npm run test:db   # pgTAP RLS tests (requires supabase start + supabase db reset)
```
