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
Set `BACKEND_API_URL` in `frontend/.env` and configure `backend/.env` as described in
[backend/README.md](./backend/README.md) before starting both services.

## Backend status

An Express API is under `backend/`; it shares the Prisma schema and migrations in `prisma/`.
Its public endpoints provide border/product/rate lookups and server-side plan previews.
Next.js server-rendered pages use a server-only adapter, and same-origin reference-data and
preview routes proxy to Express. Configure `BACKEND_API_URL` in the Next.js server
environment and allowlist the frontend origin in the backend.

Saving works two ways. **Signed out**, a plan is stored in the current browser's local
storage, does not sync across devices, may be removed when browser storage is cleared, and is
never sent to the backend. **Signed in** (optional email-and-password account), the plan is
saved to the server and the Plans page shows only that account's plans. No account is needed
to preview a plan or to save it to the device. See [backend/README.md](./backend/README.md).

## Deploying

Two services, plus a database:

| Service | Where | Notes |
| --- | --- | --- |
| Frontend (Next.js) | Vercel | Set **Root Directory** to `frontend` and enable "Include source files outside of the Root Directory in the Build Step" (the app uses `../prisma`). Without this the build fails with "output directory `.next` was not found". |
| Backend (Express) | Render, from `render.yaml` | Runs migrations at start (the free plan has no pre-deploy command). |
| PostgreSQL | Render (`crossborder-db`) | Free databases expire after a set period; check the dashboard. |

Variables that must agree between the services:

| Variable | Vercel (frontend) | Render (backend) |
| --- | --- | --- |
| `AUTH_SECRET` | required | required, **exactly the same value** |
| `DATABASE_URL` | required, **the same database** | provided by the Render database |
| `BACKEND_API_URL` | required, HTTPS URL of the backend | not used |
| `ALLOWED_ORIGINS` | not used | the exact frontend origin(s), no wildcard |

If `AUTH_SECRET` differs, or the two services use different databases, signing in works but
saving or listing account plans returns 401. The backend logs one `auth_rejected` line with a
`reason` for every refusal (see [backend/README.md](./backend/README.md)). If the backend is
unreachable, pages that need data show an error and the API returns 502 `BACKEND_UNAVAILABLE`.

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

`frontend/src/lib/data/mock/fixtures.ts` holds illustrative prototype fixtures. Common List statuses,
fees, sources and exchange rates are not authoritative. Do not use these fixtures as
trade advice. The Prisma demo seed is restricted to local databases and is never production
content.

## Layout

```
frontend/src/app/[locale]/        landing, plan/{route,product,value,result}, plans
frontend/src/components/ui/       Button, Field, OptionRow, icons
frontend/src/components/trust/    TrustBadge, TrustCallout, SourceLine, VerdictCard, HelpPanel, Disclaimer
frontend/src/components/plan/     RouteStrip, WizardShell, BackLink, ValueForm, Checklist, SavePlanButton, device and account saved-plan lists
frontend/src/lib/rules/           pure rules engine, trust-state derivation, checklist builder
frontend/src/lib/data/            Repository adapters, fixtures, and Express server client
frontend/src/lib/api/              Same-origin API proxy and server-side backend client
frontend/messages/en.json       every user-facing string
```

Wizard state lives in the URL (plain GET forms), so each step works without client JavaScript. Client components: the value form and the checklist.
