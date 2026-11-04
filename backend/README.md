# Express API

The Express API is a separate Node.js service. It currently serves versioned public
reference-data and plan-preview endpoints at `/api/v1`. It uses the repository's existing
Prisma schema and migrations in `../prisma/` as the single database contract; it does not
keep a second copy of the schema.

## Local setup

1. Install dependencies from the repository root with `npm install`.
2. Create `backend/.env` from `.env.example`. Set `DATABASE_URL` to a local PostgreSQL
   database and `ALLOWED_ORIGINS` to the exact frontend origins you use.
3. From the repository root, apply the schema with
   `npx prisma migrate deploy --schema prisma/schema.prisma`.
4. Start the API with `npm run dev:backend`. It listens on port `4000` by default.
5. Check `GET http://localhost:4000/health`.

The Next.js app and API run as separate processes. Configure the Next.js server with
`BACKEND_API_URL` (for example `http://localhost:4000` locally). Pages call Express from
server-only code; browser requests use same-origin Next.js handlers that proxy to Express.
Do not expose `BACKEND_API_URL` to browser code.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string for the shared Prisma schema |
| `PORT` | API listen port; defaults to `4000` |
| `ALLOWED_ORIGINS` | Comma-separated exact browser origins; no wildcard |
| `BACKEND_API_URL` | Next.js server-only URL of the Express API, including scheme and port |
| `NODE_ENV` | `development`, `test`, or `production` |
| `SOURCE_MAX_AGE_DAYS` | `30`; owner-approved maximum source age |
| `EXCHANGE_RATE_MAX_AGE_DAYS` | `30`; owner-approved maximum rate age |

Protected backend saved-plan and admin endpoints still require a valid server-issued
Auth.js token and the persisted user role. The trader-facing Next.js application has no
sign-in UI or token-issuing routes, and guest plans are stored only in browser local
storage; do not make those protected endpoints public or proxy guest plans to them. Keep
any backend authentication secret in an untracked environment file or deployment secret
manager; never prefix it with `NEXT_PUBLIC_`.

Use an HTTPS backend URL in production (plain HTTP is permitted only for loopback
addresses used by local builds/tests) and include the exact frontend origin
`https://crossborderassistnant.vercel.app` in the backend allowlist. Production also
requires PostgreSQL migrations to be applied before startup. Do not expose database or
service credentials to browser code.

## Endpoints implemented

- `GET /health`
- `GET /ready`
- `GET /api/v1/borders?active=true`
- `GET /api/v1/borders/:id`
- `GET /api/v1/products?q=&limit=&cursor=`
- `GET /api/v1/products/:id`
- `GET /api/v1/exchange-rates/:currency`
- `GET /api/v1/thresholds/str?from=&to=&borderId=`
- `POST /api/v1/plan-previews`
- `GET /api/v1/saved-plans`
- `POST /api/v1/saved-plans`
- `GET /api/v1/saved-plans/:id`
- `DELETE /api/v1/saved-plans/:id`
- `PATCH /api/v1/saved-plans/:id/checklist-items/:requirementId`
- `POST /api/v1/admin/sources`
- `POST /api/v1/admin/requirements`
- `POST /api/v1/admin/rules`
- `POST /api/v1/admin/exchange-rates`
- `GET /api/v1/admin/audit-logs`

The machine-readable contract is in [openapi.yaml](./openapi.yaml). Bodies and query
parameters are validated with Zod; errors use the documented `error` envelope. Public
reference responses can be briefly cached. Preview responses are no-store.

## Security and known gaps

- Explicit allowlisted CORS, Helmet headers, bounded JSON bodies, request IDs, rate limits,
  and production-only HSTS are configured.
- The preview service refuses illustrative exchange rates, requires an effective rule with
  an HTTPS source marked verified and a verification date, and returns `cannot_confirm`
  when these conditions are not met. An unknown/skipped product never yields a positive
  eligibility verdict.
- Desk contacts are withheld because the current schema has no provenance/status field
  proving that a contact is official and verified.
- The team-approved source and exchange-rate freshness window is 30 days. Production
  startup fails unless both values are configured.
- Saved-plan API operations enforce ownership and use Auth.js session tokens plus the
  persisted user role. Auth.js documents these tokens as intended for the issuing app;
  this Express-side validation is a transitional same-application integration, not a
  supported identity-provider contract.
- The legacy Auth.js token validator remains for protected backend APIs; the trader-facing
  app no longer issues tokens or offers phone, email, password, OTP, or social sign-in.
- Admin writes and audit log reads are handled by Express, require a server-verified ADMIN
  role, validate referenced records, and write audit entries in the same DB transaction.
- No production database, provider credentials, browser walkthrough, or deployment was
  available for this change. Local PostgreSQL was not reachable during validation.
- Rate limiting uses process-local memory. Production multi-instance deployments need a
  shared store such as Redis.

## Demo data

The Prisma seed is illustrative only. It refuses to run in production, requires
`ALLOW_DEMO_SEED=true`, and accepts only local database hosts. Seeded products are unknown,
sources are unverified, the rule is draft, exchange rates are flagged illustrative, and no
demo contact or fixed demo account is created. Do not use this dataset to advise traders.

The separate Busia reference seed is safe to rerun and only creates the Busia OSBP
existence/name/country-pairing record plus three linked official references. It does not
seed product-specific customs rules or demo trade data. Apply the documented migration
first, then run from the repository root with `ALLOW_REFERENCE_SEED=true`:

```powershell
$env:ALLOW_REFERENCE_SEED = "true"
npm run seed:references
Remove-Item Env:ALLOW_REFERENCE_SEED
```

It refuses to run in production and accepts only localhost database hosts.
