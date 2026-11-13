# KITA WISATA

Corporate and leisure travel booking platform: consumer site plus business portal
(Employee, Manager, Finance Admin roles).

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind v4 · Prisma 7 + PostgreSQL 17 · Auth.js v5 (phone OTP)

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

## Status
Phase 1 (foundation): repo, database, phone-OTP sign-in, placeholder pages.
Travel domain models and prototype screens follow once the open kickoff decisions are confirmed.

## Demo users (seed)
Demo company: PT Nusantara Trading Indonesia (people and reporting lines from `prototype/business/`).

| Name | Role | Reports to | Phone |
|------|------|------------|-------|
| Rina Putri | Employee (Sales Executive) | Budi Santoso | 0811 0000 0001 |
| Budi Santoso | Manager (Sales Manager) | Andi Kurniawan | 0811 0000 0002 |
| Sari Wulandari | Finance Admin | Andi Kurniawan | 0811 0000 0003 |
| Andi Kurniawan | Managing Director | (none) | 0811 0000 0004 |

Any other number signs in as a consumer Traveller and is refused entry to `/portal`.

## Access control
Use `requireRole()` from `src/lib/authz.ts` in every protected page, route handler and server action.
A check in a layout alone is not enough: Next.js renders layouts and pages in parallel.
