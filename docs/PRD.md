# CrossBorder Assist — Product Requirements Document (v0.1)

Status: v0.1, pre-validation · Owner: SOEN 370 team · Last updated: 2026-10-12
Live, editable version: the team's Claude Doc. This file is the repo copy; update both together.

## Document status

This PRD is v0.1 and pre-validation: no trader interviews have happened yet, so every requirement below is a hypothesis to confirm or kill. The SOEN 370 brief says serious development waits for validation; we build now only to have a testable prototype ready for the validation round.

Confidence tags: **[Certain]** backed by a published source · **[Likely]** strong inference · **[Guessing]** a gap to validate with users. Anything tagged [Guessing] must not be cited as fact in the proposal.

## Overview and problem statement

CrossBorder Assist turns verified trade rules into a transaction-specific checklist for a small-scale trader crossing Kenya to Uganda at Busia. Positioning: "Don't search for trade information. Build your trade plan."

**Problem hypothesis:** small-scale traders struggle to find, interpret and apply trade information for a specific consignment, even though official information exists. The candidate gap is usability, personalization and actionability, not absence of information.

**What published research supports [Certain]:**

- Small-scale traders at this border often lack information on tariffs at official crossings.
- Limited awareness of the Simplified Trade Regime (STR), including among government agencies, constrains small-scale trade.
- Small-scale traders are more likely to pay above official rates through coercive corruption.

**What we have not shown yet:** that our checklist format helps more than the existing channels do.

## Target users and personas

About 80% of small-scale traders near Busia are women, and most move goods on foot, by bicycle or by small motorbike [Certain].

| Persona | Who | Device and context | Main job |
| --- | --- | --- | --- |
| Mama Akinyi (primary) | Trader moving produce under USD 2,000 per crossing | [Guessing] mid-range Android, prepaid data, patchy signal at the border | Know what documents and official fees apply before leaving home |
| Peter (secondary) | Trader-association officer, clearing agent or Trade Information Desk staff | [Likely] smartphone or laptop, steadier connection | Prepare checklists for several traders and point them to official sources |
| Admin (internal) | Research/QA team member | Laptop | Keep rules, fees and sources current with verification dates |

[Likely] The secondary persona may be where a web app fits best, since the primary persona is already served by USSD and SMS channels.

## Existing systems and positioning

Sauti East Africa already offers tailored trade information to these traders over SMS, USSD and WhatsApp, and was evaluated in Busia; our differentiation must be stated against it.

| System | What it does | Channel | Our position |
| --- | --- | --- | --- |
| Sauti East Africa | Documentation, taxes and tariffs per product; market prices; exchange rates; border reporting | SMS, USSD, WhatsApp; local languages | Closest competitor; benchmark first |
| EAC Trade Information Portal | Step-by-step procedures, documents and costs | Web | Primary official benchmark |
| KRA eCUSTOMS / STR | Declarations, documents, payments | Web | We link to it; we never process payments |
| Trade Information Desks | In-person help at the border | Human | Our verdict sends users here when we can't confirm |
| Informal channels | Other traders, brokers, WhatsApp groups | Word of mouth | To be mapped in interviews |

**Candidate differentiators [Guessing]:** a saved, tickable checklist per consignment; visible sources and verification dates on every requirement; tooling for intermediaries who prepare plans for others.

## Goals, non-goals and success metrics

The MVP succeeds if a trader can produce a correct, source-backed checklist for one consignment faster and more confidently than with existing channels.

**Goals**

- Generate an STR-aware checklist from route, product and value in a short wizard.
- Show every requirement with its official source and last verification date.
- Let users save, revisit and tick off plans.

**Non-goals (from the brief):** customs clearance or payments, shipment tracking, transport booking, banking or M-Pesa, full legal or tax advice, all EAC borders, live unverified prices, and generative-AI answers as authority on rules.

| Metric | How we measure | Target |
| --- | --- | --- |
| Task completion | Participant produces a complete checklist unaided | Set after baseline test |
| Time to requirements | Minutes vs the same task on EAC portal and Sauti | Set after baseline test |
| Accuracy | Output matches the verified rule and source set | Every test scenario matches |
| Confidence | Self-rating before and after | Set after baseline test |

No target number is invented: the brief forbids claiming improvements not measured in testing.

## Core user flow and screens

```
Start a plan (no sign-in)
  → Step 1: Route and border (KE → UG, Busia default, Malaba second)
  → Step 2: Product (search incl. local names; shows Common List status)
  → Step 3: Quantity and value (KES or UGX; USD shown with dated rate)
  → Rule check → exactly one verdict:
       likely_str_eligible | above_threshold | not_on_common_list | cannot_confirm
  → Checklist with sources, fees, trust states, disclaimer
       → Save plan (sign-in only if signed out) → Saved plans
       → Share to WhatsApp
```

Every verdict, including "Cannot confirm", leads to a checklist; the unknown case lists only the official contacts.

| Screen | Purpose | Requirements |
| --- | --- | --- |
| Landing | One action: "Build your trade plan" | FR-11 |
| Wizard: route and border | Kenya to Uganda via Busia by default, Malaba second | FR-03 |
| Wizard: product | Search with local-name synonyms; shows Common List status | FR-03, FR-12 |
| Wizard: value | KES or UGX in, USD shown with dated rate | FR-03 |
| Result and checklist | Verdict, items, fees, sources, trust states, disclaimer | FR-04 to FR-07 |
| Requirement detail | What it is, where to get it, official fee, source | FR-06 |
| Sign in | Phone or email, decided after interviews | FR-01 |
| Saved plans | List and reopen plans | FR-02, FR-08 |
| Admin: rules and requirements | Edit rules; each change versioned | FR-09 |
| Admin: source registry | Sources with verification dates and status | FR-10 |

## Functional requirements

FR-01 to FR-10 come from the brief; FR-11 to FR-14 are added from frontend research and are hypotheses.

| ID | User story | Acceptance criteria | Priority |
| --- | --- | --- | --- |
| FR-01 | As a trader I can create an account and sign in | Sign-in works; method (phone OTP or email) decided after interviews | Must |
| FR-02 | As a trader I can save a trade plan | A plan persists and reopens with all inputs | Must |
| FR-03 | As a trader I enter route, border, product and value | Each input group is one screen; value accepted in KES or UGX | Must |
| FR-04 | The system evaluates configured rules | Same inputs always give the same verdict; rule version is recorded | Must |
| FR-05 | The system generates a checklist from applicable requirements | Every item maps to a requirement record | Must |
| FR-06 | I see the source of every important requirement | Source name, link and verification date visible per item | Must |
| FR-07 | I can tick checklist items complete | Ticked state persists on saved plans | Must |
| FR-08 | I can review saved plans | List shows route, product and date per plan | Must |
| FR-09 | An admin manages rules and source metadata | Only admin role can edit; changes create a new rule version | Must |
| FR-10 | The system records verification metadata | Each rule and source stores last-verified date and status | Must |
| FR-11 | I can build a checklist without signing in | Sign-in is requested only on Save | Should |
| FR-12 | I can find a product by its local name | Search matches synonyms in both countries | Should |
| FR-13 | I can share my checklist to WhatsApp | Share sends a plain-text summary with source links | Should |
| FR-14 | I can view saved plans with no connection | Previously opened plans render offline | Could, if interviews confirm signal loss |

## Non-functional requirements

| ID | Area | Requirement |
| --- | --- | --- |
| NFR-01 | Performance | Checklist page usable on throttled Slow 3G in Chrome DevTools within a budget the team sets at design freeze |
| NFR-02 | Bundle size | Server components by default; client JavaScript only for the wizard and checklist ticking |
| NFR-03 | Language | i18n wired from day one; English at launch, Swahili next |
| NFR-04 | Layout | Mobile-first from 360 px width; one-handed use; tap targets at least 44 px |
| NFR-05 | Readability | Body text at least 16 px; high contrast for outdoor reading |
| NFR-06 | Accessibility | WCAG 2.1 AA for contrast, labels and keyboard use |
| NFR-07 | Offline | Saved plans cached as a PWA, conditional on FR-14 |
| NFR-08 | Privacy | Collect only what a plan needs; no tracking scripts |

## Trust and information-safety model

| State | Meaning | UI treatment |
| --- | --- | --- |
| Verified | Matches a cited official source checked on a recorded date | Source link and "verified on" date |
| Unverified | Source exists but not re-checked within the agreed window | Warning tag; advise checking with the authority |
| Conflicting | Official sources disagree | Both sources shown; user sent to the Trade Information Desk |
| Unknown | No rule covers this case | Verdict "We can't confirm"; no guessed answer |

The app never claims legal clearance or guaranteed border admission. The disclaimer appears on every result page, and exchange rates come from an admin-set value with its date shown.

## Data model and rules model

Backend owns the final schema; these are the fields the UI depends on.

| Entity | Key fields |
| --- | --- |
| User | id, phone or email, role (trader, intermediary, admin), language |
| TradePlan | id, userId (nullable until saved), route, borderId, productId, quantity, unit, valueLocal, currency, valueUsd, rateId, ruleVersion, verdict, createdAt |
| Product | id, officialName, localNames[], onCommonList (yes / no / unknown) |
| Border | id, name, countries, active |
| Requirement | id, title, plainExplanation, officialFee, whereToObtain, sourceIds[] |
| Source | id, name, url, publishedAt, lastVerifiedAt, status |
| Rule | id, version, conditions, outcome, sourceId, effectiveFrom, status |
| ExchangeRate | id, currency, ratePerUsd, setAt, setBy |
| ChecklistItem | planId, requirementId, done |

**Rule model:** explicit, versioned and source-backed. Example: IF route is KE→UG AND product.onCommonList = yes AND valueUsd ≤ 2,000 THEN verdict `likely_str_eligible` and attach the STR requirements. The USD 2,000 threshold and the four STR instruments are [Certain] per KRA and EAC material but must be re-verified before launch.

## Tech stack and architecture

Next.js (App Router) + React + TypeScript on Vercel, Tailwind CSS, Prisma + managed PostgreSQL, Auth.js.

```
Phone browser ──HTTPS──▶ Next.js app on Vercel ──SQL──▶ Managed PostgreSQL
  - server-rendered pages     - API route handlers         - rules, sources (verified-on dates)
  - wizard + checklist        - rules engine (pure,        - products, borders, requirements
    (only client components)    versioned)                 - plans, users, checklist items
  - PWA cache (if FR-14)      - Auth.js, Prisma
        │
        └─ links out to official sources (EAC portal, KRA) and WhatsApp share — outside our system
```

- The rules engine lives server-side so admins can version it; the browser only collects inputs and renders results.
- No component library; Tailwind plus our own small component set.
- i18n through `next-intl` from the first commit.
- Every checklist item is rendered from API data that includes its source and trust state; the UI never hard-codes a rule.

## Open questions to validate

- [ ] What phones and data budgets do traders actually have?
- [ ] Is signal unreliable at Busia, making offline saved plans necessary?
- [ ] Which language do traders prefer for reading instructions?
- [ ] Do traders use email, or is phone-number login required?
- [ ] Have traders used Sauti, and what does it fail to do for them?
- [ ] Who helps traders fill in border forms, and would those intermediaries use a web app?
- [ ] Is the primary user the trader or the intermediary?

## Milestones and ownership

1. **Discovery and validation** — interviews, Sauti and EAC portal audit. Gate: hypothesis survives or is revised.
2. **Requirements freeze** — this PRD moves to v1.0. Gate: FR and NFR list agreed.
3. **Design** — flows, wireframes, design system, API contract. Gate: prototype tested with 3 to 5 users.
4. **Development** — MVP end to end. Gate: deployed prototype on Vercel.
5. **Testing and evaluation** — test cases and user evaluation. Gate: metrics collected.

| Role | Owns |
| --- | --- |
| Team lead / integration | Problem framing, PRD sign-off, architecture, GitHub |
| Frontend / UX (Claude June) | Flows, design system, screens, NFRs, usability audit |
| Backend / database | Schema, API, rules engine, auth |
| Research / QA / data | Interviews, source registry, testing, evaluation |

## Sources

Retrieved by web search for planning; open originals and record access dates before citing in the proposal.

- J-PAL — mobile-based market information in Kenya and Uganda (Sauti evaluation): https://www.povertyactionlab.org/evaluation/impact-mobile-based-market-information-informal-cross-border-trading-kenya-and-uganda
- IGC — trade, informality and corruption among small-scale traders in Kenya: https://www.theigc.org/blogs/trade-informality-and-corruption-evidence-small-scale-traders-kenya
- Wiseman — Border Trade and Information Frictions: https://www.atai-research.org/wp-content/uploads/2023/04/Wiseman-Border-Trade-and-Information-Frictions.pdf
- EPRC Uganda — outstanding challenges to small-scale cross-border trade: https://library.eprcug.org/publication/outstanding-challenges-to-small-scale-informal-cross-border-trade-in-uganda1
- KRA MSME Information Pack — Simplified Trade Regime: https://kratv.kra.go.ke/wp-content/uploads/2023/10/MSME-information-Pack_CBC-2792023.pdf
- TradeMark Africa — review of the EAC Simplified Trade Regime: https://erra.trademarkafrica.com/?p=66140
- COMESA — time to reform the Simplified Trade Regime: https://comesa.int/?p=94599
