# CrossBorder Assist

A SOEN 370 project (Kisii University). It turns verified trade rules into a checklist for a small-scale trader crossing Kenya to Uganda at Busia.

**Status: v0.1, pre-validation.** Everything here is a hypothesis to test with traders. Read `CLAUDE.md` first, then `docs/PRD.md` (what) and `docs/DESIGN.md` (how it looks).

## Run it

```bash
npm install
npm run dev          # terminal 1: http://localhost:3000/en
npm run dev:backend  # terminal 2: http://localhost:4000
npm test             # Vitest
npm run test:backend # Express domain tests
npm run typecheck
npm run typecheck:backend
npm run lint
```

Node 20.9 or newer.
Set `BACKEND_API_URL` in the root `.env` and configure `backend/.env` as described in
[backend/README.md](./backend/README.md) before starting both services.

## Backend status

An Express API is under `backend/`; it shares the Prisma schema and migrations in `prisma/`.
Its public endpoints provide border/product/rate lookups and server-side plan previews.
Next.js server-rendered pages use a server-only adapter, and same-origin reference-data and
preview routes proxy to Express. Configure `BACKEND_API_URL` in the Next.js server
environment and allowlist the frontend origin in the backend. Saved plans are guest-only:
they are stored in the current browser's local storage, do not sync across devices, and may
be removed when browser storage is cleared. They are never sent to the backend. The backend
retains its authenticated saved-plan and admin APIs for future approved use; guest access
does not weaken those protections. See [backend/README.md](./backend/README.md).

No account or sign-in is required to preview or save a plan. The database and deployment
still need environment setup and verification.

### Seed the Busia reference record

After applying migrations, the dedicated local-only command below creates or verifies the
Busia border reference and its three official source links. It does not seed demo trade
rules, fees, contacts, thresholds, or product data. Set the explicit opt-in only for a
local database:

```powershell
$env:ALLOW_REFERENCE_SEED = "true"
npm run seed:references
Remove-Item Env:ALLOW_REFERENCE_SEED
```

The linked sources support the existence, name, and Kenya–Uganda pairing of the Busia OSBP
only; they do not establish product-specific customs rules. The seed refuses to run in
production or against a non-local database.

`src/lib/data/mock/fixtures.ts` holds illustrative prototype fixtures. Common List statuses,
fees, sources and exchange rates are not authoritative. Do not use these fixtures as
trade advice. The Prisma demo seed is restricted to local databases and is never production
content.

## Layout

```
src/app/[locale]/        landing, plan/{route,product,value,result}, plans
src/components/ui/       Button, Field, OptionRow, icons
src/components/trust/    TrustBadge, TrustCallout, SourceLine, VerdictCard, HelpPanel, Disclaimer
src/components/plan/     RouteStrip, WizardShell, ValueForm, Checklist, device-local save/listing
src/lib/rules/           pure rules engine, trust-state derivation, checklist builder
src/lib/data/            Repository adapters, fixtures, and Express server client
src/lib/api/              Same-origin API proxy and server-side backend client
messages/en.json         every user-facing string
```

Wizard state lives in the URL (plain GET forms), so each step works without client JavaScript. Client components: the value form and the checklist.
