# KITA WISATA

Corporate and leisure travel booking platform: consumer site plus business portal
(Employee, Manager, Finance Admin roles).

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind v4 · Prisma 7 + PostgreSQL 17 · Auth.js v5 (phone OTP) · Open Sans (self-hosted)

## Getting started
Requires Node 22, pnpm 10 and Docker.

```bash
pnpm install
cp .env.example .env          # then set AUTH_SECRET (npx auth secret)
docker compose up -d          # Postgres on :5432
pnpm prisma migrate dev
pnpm db:seed                  # demo company and users
pnpm dev                      # http://localhost:3000
```

In development, OTP codes are printed to the server console (`[otp] +62... -> 123456`).

## Prototypes and decisions
- `prototype/`: the reference prototypes with photos (see `prototype/README.md`).
- `docs/decisions.md`: answers to the kickoff questions and how the build applies them.

## Business rules
Pure, unit-tested functions in `src/domain/`:
`estimate.ts` (SPPD budget), `approval.ts` (chain up to the Director), `cancellation.ts` (Open Trip fees),
`paymentPlan.ts` (30% down payment schedule), `booking.ts` (bookable options and budget check),
`sppdNumber.ts`, `dates.ts`.

## Status
- Phase 1 (foundation): repo, database, phone-OTP sign-in, placeholder pages.
- Phase 2 (domain): travel data model, business rules, demo seed.
- Phase 3a (business portal): My travel, new SPPD request with live budget, SPPD detail with approval
  timeline, approvals inbox (approve, reject with a note). The final approval issues the SPPD number.
- Phase 3b (booking): plan an approved trip inside the grade limits (flights, trains, hotels, cars);
  options above the policy are locked, prices are rebuilt on the server, and items can be booked in parts.
- Phase 4a (settings): Finance sets the approval rules; ops creates and edits Open Trips with their terms and
  cancellation fees; brand theme from the logo.
- Next: Finance reports and the monthly invoice.

## Demo users (seed)
Demo company: PT Nusantara Trading Indonesia (people and reporting lines from `prototype/business/`).

| Name | Role | Reports to | Phone |
|------|------|------------|-------|
| Rina Putri | Employee (Sales Executive) | Budi Santoso | 0811 0000 0001 |
| Budi Santoso | Manager (Sales Manager) | Andi Kurniawan | 0811 0000 0002 |
| Sari Wulandari | Finance Admin | Andi Kurniawan | 0811 0000 0003 |
| Andi Kurniawan | Managing Director | (none) | 0811 0000 0004 |
| Dimas Pratama | Employee (Account Executive) | Budi Santoso | 0811 0000 0005 |
| Ayu Lestari | Employee (Supervisor) | Hendra Wijaya | 0811 0000 0006 |
| Hendra Wijaya | Manager (Operations Manager) | Andi Kurniawan | 0811 0000 0007 |
| Fajar Nugroho | Employee (IT Engineer) | Hendra Wijaya | 0811 0000 0008 |
| kitawisata Ops | Ops (back office, no company) | (none) | 0811 0000 0009 |

The seed also loads the prototype's grade policies, cities and hotels, seven SPPDs with their approval
chains and bookings, and six Open Trips. Dates are shifted so the demo always sits around today; set
`DEMO_ANCHOR=YYYY-MM-DD` to pin them.

Any other number signs in as a consumer Traveller and is refused entry to `/portal`.

## Access control
Use `requireRole()` from `src/lib/authz.ts` in every protected page, route handler and server action.
A check in a layout alone is not enough: Next.js renders layouts and pages in parallel.
