# Gateway end-to-end tests

`gateway.e2e.js` checks online payment for bookings (Midtrans and Xendit) and `invoice-pay.e2e.js` checks
companies paying invoices, end to end, against `mock-gateway.js`, a local stand-in that
implements the provider calls the app makes, a payment page, and the signed notifications each provider sends.
It does not replace a run against the real sandboxes (see `docs/decisions.md` §13).

```bash
docker compose up -d && pnpm db:seed && pnpm build
# 1. the stand-in (keys must match what the test saves on Payment settings)
MID_KEY=SB-Mid-server-LOCALTEST XND_KEY=xnd_development_LOCALTEST XND_TOKEN=cbtok-local-123 node e2e/mock-gateway.js &
# 2. the app, pointed at the stand-in; OTP codes go to server.log
AUTH_TRUST_HOST=true APP_URL=http://localhost:3000 MIDTRANS_SNAP_BASE=http://localhost:4010 \
  MIDTRANS_API_BASE=http://localhost:4010 XENDIT_API_BASE=http://localhost:4010 pnpm start > server.log 2>&1 &
# 3. the test (Playwright; resets nothing, so start from a fresh seed)
node e2e/gateway.e2e.js server.log /tmp
# reseed before the next one (OTP resend limit: wait a minute between runs)
node e2e/invoice-pay.e2e.js server.log
```
