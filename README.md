# CrossBorder Assist

A SOEN 370 project (Kisii University). It turns verified trade rules into a checklist for a small-scale trader crossing Kenya to Uganda at Busia.

**Status: v0.1, pre-validation.** Everything here is a hypothesis to test with traders. Read `CLAUDE.md` first, then `docs/PRD.md` (what) and `docs/DESIGN.md` (how it looks).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000/en
npm test             # Vitest
npm run typecheck
npm run lint
```

Node 20.9 or newer.

## Prototype data

There is no backend yet. `src/lib/data/mock/fixtures.ts` holds fixtures copied from the design canvas. Common List statuses, fees, sources and the exchange rates in it are **illustrative**. Text in `[square brackets]` marks data we do not have. The UI reads only through the `Repository` interface (`src/lib/data/repository.ts`), so the Prisma implementation drops in without touching components.

## Layout

```
src/app/[locale]/        landing, plan/{route,product,value,result}, plans
src/components/ui/       Button, Field, OptionRow, icons
src/components/trust/    TrustBadge, TrustCallout, SourceLine, VerdictCard, HelpPanel, Disclaimer
src/components/plan/     RouteStrip, WizardShell, ValueForm, Checklist, SavedPlanCard
src/lib/rules/           pure rules engine, trust-state derivation, checklist builder
src/lib/data/            Repository interface + mock implementation
messages/en.json         every user-facing string
```

Wizard state lives in the URL (plain GET forms), so each step works without client JavaScript. Client components: the value form and the checklist.
