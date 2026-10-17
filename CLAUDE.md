# CLAUDE.md — CrossBorder Assist

Guidance for Claude Code (and any AI assistant) working in this repository. Read this fully before writing code.

## What this project is

CrossBorder Assist is a SOEN 370 (Design and Development of Software) group project at Kisii University, built by a four-person team.
It is a web app that turns **verified** trade rules into a **transaction-specific checklist** for small-scale traders crossing Kenya → Uganda (initially at Busia).

A trader enters route, border, product and value. The system applies versioned, source-backed rules and returns a verdict plus a checklist of documents, steps and official fees, each with its source and last-verified date.

**Status: v0.1, pre-validation.** Trader interviews have not finished. Requirements are hypotheses. Read these before building any feature:

- `docs/PRD.md` — requirements (FR/NFR IDs), data model, rules model, scope. Source of truth for *what* to build.
- `docs/DESIGN.md` — tokens, components, screen specs, copy and accessibility rules. Source of truth for *how it looks*.

If code, PRD and design disagree, flag it in the PR rather than silently picking one. Reference FR/NFR IDs in commit messages and PRs where relevant.

## Hard rules (never break these)

1. **Never invent trade rules, fees, thresholds or documents.** All rule content comes from the database (seeded by the Research/QA member from official sources). Do not hard-code requirements in components. Do not generate rule content with AI.
2. **Never claim legal clearance or guaranteed border admission** in any UI copy. The disclaimer component must appear on every result page.
3. **Every checklist item renders its trust state**: `verified`, `unverified`, `conflicting`, or `unknown`. A missing source is `unknown`, never silently treated as verified.
4. **Unknown means "we can't confirm."** If no rule matches, show the "Cannot confirm — ask the Trade Information Desk" verdict. Never fall back to a guess.
5. **Out of scope** (do not build, even if it seems easy): customs clearance, payments, M-Pesa/banking, shipment tracking, transport booking, live market prices, all-EAC coverage, AI chat answers about rules.
6. **Do not fabricate evaluation numbers** in docs, tests or seed data descriptions.

## Tech stack

- Next.js (App Router) + React + TypeScript (strict mode)
- Tailwind CSS (no component library; our own small component set in `src/components/ui`)
- Prisma ORM + managed PostgreSQL
- Auth.js (login method — phone OTP vs email — is **not decided**; keep auth behind an interface)
- `next-intl` for i18n from day one (English first, Swahili next)
- Hosted on Vercel; GitHub for version control

## Users and constraints that drive frontend decisions

- Primary users are small-scale traders, mostly women, many on **low-end Android phones with prepaid data and patchy signal** at the border (hypothesis, being validated).
- Secondary users may be intermediaries (trader-association officers, clearing agents, Trade Information Desk staff).
- Design mobile-first from **360 px** width. One-handed use. Tap targets ≥ 44 px. Body text ≥ 16 px. High contrast (outdoor reading).
- Target WCAG 2.1 AA.

## Colour tokens (plain teal)

Restraint is the rule: white, near-black, neutral greys, and ONE teal. No gradients, no shadows, no second brand colour, no tinted hero blocks. Colour beyond teal appears only in trust badges.

Define these in `tailwind.config` and use only the token names in components.

| Token | Hex | Use |
|---|---|---|
| `brand` | #17767B | Primary buttons, links, selected borders, verdict text, focus rings |
| `brand-dark` | #0E5458 | Hover and pressed states |
| `surface` | #FAFAF9 | Page background |
| `panel` | #FFFFFF | Cards, header, footer |
| `muted` | #F2F2F0 | Selected rows, neutral info panels |
| `line` / `line-strong` | #E3E3E0 / #C9C9C5 | Card borders / input borders |
| `ink` / `ink-muted` | #1A1A1A / #5C5C5C | Body text / secondary text |

Shape: 8 px radius on everything (cards, buttons, inputs, badges 6 px). 1 px borders, 1.5 to 2 px only for selected or focused. No pills, no dashed decorative borders.

Trust-state colours are separate from the brand and must stay visually distinct from teal:

| State | Background / text |
|---|---|
| Verified | #EAF4DA / #3F6B12 (yellow-green, kept away from teal on purpose) |
| Not re-checked | #FBEFD9 / #7A4900 |
| Sources disagree | #FBE5DB / #9A3510 |
| Cannot confirm | #E8ECEF / #3E4A52 |

## Performance rules

- **Server components by default.** Add `"use client"` only for: the trade-plan wizard, checklist ticking, and share buttons.
- Keep client JS small. No heavy libraries (no moment, lodash full import, chart libs, animation libs) without team agreement.
- Test pages on Chrome DevTools "Slow 3G" + 4× CPU throttle before opening a PR that changes a page.
- Images: `next/image`, sized, lazy. Prefer SVG icons inline; no icon font.
- Offline (PWA cache of saved plans) is **conditional** on interview findings (FR-14). Don't add a service worker until the team decides.

## i18n rules

- No user-facing string literals in components. Every string goes through `next-intl` message files in `messages/{locale}.json`.
- Keep copy plain: short sentences, no legal jargon without a plain explanation.
- Product search must support local-name synonyms (`Product.localNames[]`).

## Domain model (summary — backend owns the final schema)

`User`, `TradePlan`, `Product`, `Border`, `Requirement`, `Source`, `Rule` (versioned), `ChecklistItem`.

Key fields the UI depends on:
- `Product.onCommonList`: `yes | no | unknown`
- `Source.lastVerifiedAt`, `Source.status`
- `Rule.version`, `Rule.effectiveFrom`, `Rule.sourceId`
- `TradePlan.valueLocal`, `currency` (`KES | UGX`), `valueUsd`, `rateId` (admin-set exchange rate with a date — never a live feed)

## Core flow

1. Start a plan (no sign-in needed)
2. Route and border (default KE → UG via Busia)
3. Product (search with local names; show Common List status)
4. Value (KES or UGX in; USD shown with the dated rate)
5. Rule check → one verdict: `likely_str_eligible`, `above_threshold`, `not_on_common_list`, `cannot_confirm`
6. Checklist with sources, fees, trust states, disclaimer
7. Save (sign-in requested only here) · Share to WhatsApp (`wa.me` link, plain text + source links)

## Suggested structure

```
src/
  app/
    [locale]/
      page.tsx                 # landing
      plan/                    # wizard steps + result
      plans/                   # saved plans
      admin/                   # rules, requirements, sources (admin role only)
    api/                       # route handlers
  components/
    ui/                        # Button, Input, Card, Badge, Stepper...
    trust/                     # TrustBadge, SourceLine, Disclaimer, Verdict
    plan/                      # wizard steps, ChecklistItem
  lib/
    rules/                     # rules engine (pure functions, fully unit-tested)
    db.ts                      # Prisma client
    auth.ts
  messages/                    # en.json, sw.json
prisma/
  schema.prisma
  seed.ts                      # seed ONLY from the verified source registry
```

## Coding conventions

- TypeScript strict; no `any` without a comment explaining why.
- The rules engine is **pure** (inputs → verdict + requirement ids). No DB calls inside it; no randomness. Same inputs must always give the same output.
- Validate all inputs with `zod` at API boundaries.
- Components: small, typed props, no business logic. Rule logic never lives in React components.
- Tailwind: use the design tokens in `tailwind.config` (colours, spacing, radius). No ad-hoc hex values.
- Accessible by default: labels on every input, visible focus states, `aria-live` on the verdict.

## Testing

- Unit tests for every rule and verdict branch (Vitest).
- Each test scenario cites the source/rule version it checks against.
- Component tests for trust states (React Testing Library).
- Keep an expected-vs-actual record for the SOEN 370 test plan.

## Git workflow

- Branch per feature: `feat/<area>-<short-name>`, `fix/...`, `docs/...`.
- Small PRs, one reviewer from the team minimum.
- Commit messages: imperative, present tense (`Add checklist trust badge`).
- Every member commits their own work — contribution evidence is graded.

## Documentation the course requires

Record architecture decisions as ADRs in `docs/adr/NNNN-title.md`. Log significant design changes, problems and solutions in `docs/log.md`. Never present a hypothesis or future feature as an established fact in docs.

## When unsure

Ask the team (or flag in the PR) rather than guessing — especially on anything touching rules, fees, legal wording or scope.
