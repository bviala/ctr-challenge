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

## Notes

I decided to implement the solution using Next.js API routes, Supabase and RLS as I'm unfamiliar with them and wanted to see how it would work. 
However with scalability in mind, I would probably make different design choices:
- Next in SPA mode if no strong need for SEO: less complexity and operational costs.
- Separate API project for better flexibility and separation of concern.
- Direct connection to DB instead of relying on Supabase's PostgREST layer.
- Authorization implemented in API for ease of testing, updating and refactoring.

The idea would be to decouple data persistence from business rules from UI. 

## Run

Copy `.env.example` to `.env.local` and update the following:

```env
NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[INSERT SUPABASE PROJECT API PUBLISHABLE OR ANON KEY]
```
