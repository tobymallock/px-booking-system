# Phase 1 setup guide

This covers getting the scaffold running locally and on Supabase/Vercel.
Reference: `PX-Booking-System-Plan-v3.1.docx` (canonical plan) for the full
roadmap and data model rationale.

## 1. Install dependencies

```bash
npm install
```

## 2. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Pick an EU region (Frankfurt or similar) — required for FADP/GDPR given
   we store passport/medical data in later phases.
3. Once created, go to **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret, server-only)
4. Go to **Project Settings → Database → Connection string**:
   - Copy the **Transaction pooler** URI → `DATABASE_URL`
   - Copy the **Direct connection** URI → `DIRECT_URL` (Prisma migrations need
     a non-pooled connection)
5. Copy `.env.example` to `.env` and fill in all five values.

## 3. Run the first migration + seed

```bash
npx prisma migrate dev --name init
npm run db:seed
```

This creates all tables and seeds the three brands (PV, PX, VV).

## 4. Create your first admin user

1. In Supabase dashboard → **Authentication → Users → Add user**, create
   yourself with email + password.
2. Copy the generated user UUID.
3. In Supabase → **Table Editor** (or `npx prisma studio`), insert a row into
   the `User` table:
   - `id` = the Supabase auth UUID you just copied
   - `email` = same email
   - `fullName` = your name
   - `role` = `ADMIN`

(Phase 2 adds an admin UI for inviting office staff and instructors so this
manual step goes away.)

## 5. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000/login`, sign in, and you should land on
`/instructors`.

## 6. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → import the
   `px-booking-system` GitHub repo.
2. Set the project region to an EU region under **Settings → Functions**
   (consistent with Supabase region, for data residency).
3. Add all variables from `.env` as **Environment Variables** (Production +
   Preview).
4. Deploy. Vercel will run `npm install` (which triggers `prisma generate`
   via `postinstall`) and `npm run build`.
5. Migrations are not run automatically on deploy — run
   `npx prisma migrate deploy` manually (or wire into a deploy hook) whenever
   the schema changes.

## What's in this Phase 1 scaffold

- Next.js App Router + TypeScript + Tailwind
- Prisma schema covering the full data model from the canonical plan
  (Brand, Season/PeakPeriod, PriceList/PriceTier, Instructor, Client,
  Partner/CommissionRate, RentalItem, Booking/BookingLineItem, Payment,
  Invoice, AuditLog, User/RBAC) — entities beyond Phase 1 scope are modelled
  now to avoid breaking migrations later, but have no UI yet
- Supabase Auth wiring (browser + server clients, session-refresh middleware)
- Role-based access (Admin / Office / Instructor) with an office-only route
  group
- CRUD: Instructors, Clients, Partners + per-brand commission rates
- Brand seed: PV, PX, VV (VV priced from PV per the resolved open question)

## Not yet built (later phases)

- Instructor-facing mobile schedule view (Phase 2)
- Booking creation/scheduling UI (Phase 2)
- Booking confirmation PDF generation + email (Phase 3)
- Payments (Worldline Saferpay) + split-payment ledger UI (Phase 4)
- Invoicing (client gross / partner net, hotel concierge fortnightly runs)
  (Phase 4)
- Revenue tracking/reporting + WinBiz CSV export (Phase 6)
- Rental inventory booking UI (builds on the `RentalItem` schema already in
  place)
