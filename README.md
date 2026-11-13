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
pnpm dev                      # http://localhost:3000
```

In development, OTP codes are printed to the server console (`[otp] +62... -> 123456`).

## Status
Phase 1 (foundation): repo, database, phone-OTP sign-in, placeholder pages.
Travel domain models and prototype screens follow once the open kickoff decisions are confirmed.
