## Assumptions

- A user can be admin xor student
- Signed up user have student role as default
- Assigning admin role to users through the Supabase Console is acceptable at this stage (PoC)
- A consultation is incomplete by default
- A student can mark a consultation complete or incomplete as many times as they like, before or after the scheduled consultation date

## Additional requirements

Arbitrary additional requirements (I was curious how to implement them with the stack).
- Consultations completion changes, reschedules and cancellations should be auditable.
- Admin can also mark complete, reschedule or cancel.
- User can add a free text note when completing, rescheduling or cancelling a consultation.

## Design decisions

I decided to implement the solution using Next.js API routes, Supabase and RLS as I'm unfamiliar with them and wanted to learn about them.

However with scalability and long term maintainability in mind, I would make different design choices:
- Next in SPA mode if no strong need for SEO: less complexity and operational costs.
- Separate API project for better flexibility and separation of concerns, with hexagonal architecture to isolate business layer.
- Code based authorization for ease of testing, updating, refactoring.
- Direct connection to DB instead of relying on Supabase's PostgREST layer.

The idea would be to decouple data persistence, business rules, and UI. 

## Summary of implementation

- RBAC roles are stored in a custom profiles table to avoid stale token issues, provide better auditability and ease of update.
- Routes: `/student`, `/admin`, `/consultations/[id]`, `/api/consultations/*`, `/auth/*` (from template).
- Proxy (`lib/supabase/proxy.ts`): unauthenticated redirect, /api bypass, role-based routing (/, /student, /admin).
- Components: ConsultationList, AddConsultationDialog, ConsultationDetails, RescheduleConsultationDialog, ConsultationStatusDialog
- Data flow: 
  - read: client → GET API → RLS
  - write: client → POST API → RPC (→ trigger → events).

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

## Future improvements
- Pagination
- Tests

## Run

Copy `.env.example` to `.env.local` and update the following:

```env
NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[INSERT SUPABASE PROJECT API PUBLISHABLE OR ANON KEY]
```

`npm run dev`
