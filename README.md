# PX Group Booking System

Multi-brand booking, invoicing and revenue management system for **Powder
Extreme Sarl**, covering three instruction brands operating in Verbier:

- **Performance Verbier (PV)** — ski lessons
- **Powder Extreme (PX)** — off-piste / snowboard lessons
- **Vivid (VV)** — shares PV's price list

Built to replace the existing Excel-based confirmation/invoice/revenue-
tracker workflow without requiring historical data migration.

See `docs/phase-1-setup.md` for local setup, Supabase/Vercel configuration,
and what's in scope for this phase. The canonical requirements/architecture
document is `PX-Booking-System-Plan-v3.1.docx`, kept alongside this repo.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- PostgreSQL via Supabase, Prisma ORM
- Supabase Auth (email/password for office/admin, magic link for instructors)
- Vercel (EU region) hosting
- Resend (email), Worldline Saferpay (payments), React-PDF (confirmations/
  invoices) — wired in later phases

## Quick start

```bash
npm install
cp .env.example .env   # fill in Supabase values, see docs/phase-1-setup.md
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```
