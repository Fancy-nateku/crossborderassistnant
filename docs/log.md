# Design and development log

## 2026-10-17 Frontend scaffold from the design canvas

Built the six canvas screens in Next.js from `docs/DESIGN.md` and the "Core Flow v0.1" canvas.

Decisions and differences from the docs. Each needs a team nod:

- **Tokens in CSS, not `tailwind.config`.** The scaffold ships Tailwind v4, which defines tokens in `@theme` inside `src/app/globals.css`. Token names and values match `CLAUDE.md`.
- **Radius is 8 px on inputs.** The canvas uses 10 px on inputs and selects; `DESIGN.md` says 8 px everywhere. Followed `DESIGN.md`.
- **Full disclaimer on the landing page.** The canvas shows a shorter line; `DESIGN.md` says the full disclaimer text goes on landing and result pages. Followed `DESIGN.md`.
- **No language button yet.** Only English exists. The button appears when a second locale is added to `src/i18n/routing.ts`.
- **Cache Components off.** `create-next-app` enabled `cacheComponents` and `partialPrefetching`. Every wizard step reads URL params and would need Suspense wrapping, so both were removed. Revisit with performance testing.
- **Wizard state is in the URL.** Steps are plain GET forms. No client state, works if JavaScript fails to load. Share links for a plan fall out of this for free.
- **Product search runs on submit,** not as you type, to keep client JavaScript out of step 2.
- **Save plan links to Saved plans.** Nothing is persisted and there is no sign-in yet (FR-01, FR-02, FR-07 belong to the backend). Checklist ticks are in-browser only.
- **Illustrative exchange rates** (KES 130, UGX 3700 per USD) exist only so the prototype can reach a verdict. They are flagged `illustrative` in the data and the value screen says so. They are not admin-set rates.
- **Dates:** fixture sources have no `lastVerifiedAt`, so the UI shows "[date not recorded]" rather than inventing one.
- **Fixture rules for `above_threshold` and `not_on_common_list`** have empty requirement lists, because the canvas defines no items for them. Those results show the verdict, a "no verified checklist" note and the Trade Information Desk panel.

## 2026-10-17 Responsive layouts for tablet and desktop

`docs/DESIGN.md` keeps the trader flow in a 480 px column on wide screens. We now use the room instead. Needs a team nod, and `DESIGN.md` should be updated to match.

- **Shared container** (`src/components/ui/container.tsx`). Header and footer bars span the full width; content sits in a `narrow` (480 px, 640 px from 768 px) or `wide` (1120 px) container. Side padding grows from 20 px to 32 px.
- **Landing:** from 1024 px the headline and button sit left and the route strip right. Steps become three columns from 768 px.
- **Wizard steps:** a 640 px form column from tablet up. Border and product options go two across. The primary button sits bottom right at a fixed width instead of full width.
- **Result:** one column up to 1023 px. From 1024 px the checklist fills the right column and the verdict, actions and help panel stack on the left.
- **Saved plans:** one, two, then three cards across.
- Phone layout at 360 to 390 px is unchanged. Tap targets (44 px) and text sizes (16 px body) are the same at every width.

## 2026-10-18 Site pages, shorter copy, phone tab bar, quality pass

Needs a team nod on everything below. Pushed to `main` by one member before review; this entry and the follow-up branch `chore/quality-pass` are the catch-up.

- **New pages:** How it works, About, Help (FAQ). Not in `DESIGN.md` screens table; added there as "not yet designed".
- **Site header, footer and phone bottom tab bar** on content pages. Wizard and result keep their own focused header and sticky action. Page links live in `src/components/site/nav-config.ts`.
- **Copy shortened** across `messages/en.json`. **Wording to review:** the disclaimer is shortened ("Informational guidance based on referenced sources. Not a customs authority, legal adviser or government service. Check requirements with the official authority before you trade."). It drops "tax authority". `CLAUDE.md` says legal wording goes to the team. The About page text is based only on `CLAUDE.md` ("student team at Kisii University", SOEN 370) and needs a factual check by the team.
- **Wizard column widths** are now 720 px (768 px+) and 880 px (1024 px+), up from the 640 px in the entry above. Product options go three across from 1024 px. On the value step the value and dollar panel sit side by side from 1024 px. On the result page the verdict column stays in view while the checklist scrolls from 1024 px.
- **Safe areas:** `viewportFit: "cover"` and bottom padding for notches and gesture bars. The tab bar shrinks on short landscape screens (height up to 480 px).

Quality pass (production build, `next start`, Lighthouse mobile defaults: simulated slow 4G, 4x CPU slowdown, run on a development laptop, one run each):

| Page | Performance | Accessibility | Best practices | LCP | TBT |
| --- | --- | --- | --- | --- | --- |
| Landing | 91 | 100 | 100 | 1.4 s | 380 ms |
| About | 92 | 100 | 100 | 1.3 s | 350 ms |
| Route step | 92 | 100 | 100 | 1.8 s | 330 ms |
| Result | 95 | 100 | 100 | 2.1 s | 230 ms |

- Total blocking time is mostly React and Next runtime (about 119 KB of about 130 KB transferred JavaScript on the landing page). Our own chunk is about 2 KB. No code change made.
- The result page fails Lighthouse's back/forward-cache check because Next serves dynamic pages as no-store. Not changed.
- Automated checks do not replace testing on a real low-end Android phone on a slow connection. Not done yet.
- Added component tests for the page links, bottom bar and footer disclaimer.

## 2026-10-18 Screen tests

Every screen now has an automated test. `npm test` runs 124 tests in 15 files, all passing
(87 of them new; the 37 existing unit and component tests are unchanged).

Problem: the screens are async server components. `next-intl/server` needs a Next request
context and the generated `@/i18n/navigation` pulls in `next/navigation`, neither of which
resolves under Vitest. Solution: a small harness in `src/test/`.

- `src/test/screen.tsx` awaits the page, renders the returned tree inside
  `NextIntlClientProvider` (the client parts use `useTranslations`), and exposes
  `redirectTarget` for the steps that send an incomplete plan back, plus `metadataTitle`.
- `src/test/mocks/intl-server.ts` serves `getTranslations` through `createTranslator` over
  the real `messages/en.json`, so the tests assert the copy a trader actually sees.
- `src/test/mocks/navigation.tsx` renders `Link` with a readable href (plan query included)
  and makes `redirect` throw, as Next's does.

Expected-vs-actual record for the SOEN 370 test plan. Every row passed; "expected" is the
behaviour the test asserts, taken from `docs/DESIGN.md`, `docs/PRD.md` and the `CLAUDE.md`
hard rules. Rule content comes from the mock fixtures, so these tests check the UI and the
wiring, not the trade rules themselves.

| Screen | Tests | Expected behaviour covered |
| --- | --- | --- |
| Locale shell (`layout.tsx`) | 5 | Prerenders the declared locales; title and description from messages; `width=device-width`; `lang` from the locale; an unserved locale 404s |
| Landing | 5 | Headline, "Start a plan" to the wizard, no account needed; the three steps in order; all four trust states in words; disclaimer and bottom nav; default crossing on the route strip |
| How it works | 4 | Metadata; the four steps from the message file in order; each trust label beside its badge; CTA into the wizard |
| About | 4 | Metadata; the does / is not / where / who sections; "Not a customs office" plus the disclaimer; CTA |
| Help | 4 | Metadata; one collapsed disclosure per question, all closed, every answer present; the account and clearance answers; CTA |
| Route (step 1) | 8 | "Step 1 of 3"; KE → UG default; every active crossing with Busia selected; keeps a chosen crossing; an unknown crossing in the URL falls back to a known one; uncovered crossings are named as not covered; GET form to step 2 with the rest of the plan in hidden fields |
| Goods (step 2) | 10 | "Step 2 of 3"; back link keeps the plan; every product with its Common List status in words; local-name search ("maharagwe" → Beans, dry) and match counts; a named no-match message; keeps the chosen product; skip drops the stale product id; separate search and submit GET forms; labelled search box |
| Value (step 3) | 11 | "Step 3 of 3"; back link keeps the plan; an unknown crossing goes back to step 1; quantity, unit and value fields prefilled from the URL; dollar conversion with the dated rate, flagged illustrative; no dollars until a value is entered; reconverts on typing and on currency switch; the USD 2,000 ceiling read from rule data; inline errors block an incomplete plan; a complete plan submits to the result screen |
| Result | 24 | One labelled verdict with `aria-live`, summarised in the trader's terms; all four verdict branches, including "cannot confirm" when the list status is unknown or the match was skipped; checklist in rule order; a trust state on every item; "sources disagree" names its subject; "not re-checked" flagged; verified items cite their source; "[date not recorded]" when a source has no check date; official fee and where to obtain; tick counter; the disclaimer on all four verdicts; save link; WhatsApp share text with verdict, items and source links; Trade Information Desk for the chosen crossing; back link; and the four redirects for an incomplete plan |
| Saved plans | 12 | Metadata; signed-in identifier; plans still list when signed out; title, crossing and details per card; progress and "Not started"; save date; the rule-changed warning; reopening a plan carries its inputs; "Build a new plan"; the empty state and its CTA; a plan whose crossing is no longer offered is dropped, not rendered broken; header and bottom nav |

Checked by mutation, to confirm the tests fail when behaviour breaks: removing `<Disclaimer />`
from the result page fails one test; making `deriveTrustState` treat "no source" as verified
(breaking `CLAUDE.md` rule 3) fails another. Both changes were reverted.

Not covered by this entry (the follow-up below closes the first three):
- Visual and layout regressions. These tests assert copy, roles and links, not CSS.
- Structure and naming rules applied screen by screen, rather than per screen ad hoc.
- Sizes that need a layout engine: tap targets, text sizes, sideways scrolling.
- Real devices and slow connections. Unchanged from the entry above: not done yet.
- Screen-reader walkthroughs of each screen by hand.
- The Swahili locale, which does not exist yet; the harness pins the tests to `en`.

## 2026-10-18 Accessibility assertions and browser checks for every screen

Follow-up to the entry above, closing its first three open items. Needs a team nod on the
new dev dependency and on the two findings at the end.

`npm test` is now 202 tests in 16 files (124 before, plus 78 accessibility and structure
assertions). `npm run test:visual` is 77 browser checks plus 11 skipped, in Chromium at two
widths. Both suites pass, and both were checked by mutation.

**Accessibility and structure** (`src/app/[locale]/screens.a11y.test.tsx`). One table over all
nine screens, so a new screen inherits the checks by being added to the list: exactly one
non-empty `h1`; headings start at `h1` and never skip a level; a `main` landmark; every
control, link and button has an accessible name; every `fieldset` is a named group; nothing
focusable hides inside an `aria-hidden` subtree; every image has an `alt`. Then the live
regions, which matter because the verdict and the dollar conversion change under the
trader: `aria-live` on the verdict, the tick count, the dollar panel and the match count,
plus each inline error tied to its field through `aria-describedby`.

**Browser checks** (`e2e/`, Playwright, new `@playwright/test` dev dependency). `npm run build`
then Chromium at 360 px (`phone-360`) and 1280 px (`desktop-1280`), on port 3100 so it does
not collide with a dev server on 3000.

- `e2e/screens.layout.spec.ts` — no sideways scrolling at either width; every tap target at
  least 44 px; no content text below 13 px. The 44 px rule is checked at phone width only:
  with a mouse at 1280 px a checklist row is 587 px wide and one line tall, which is fine to
  click. Tap targets are measured as the area a finger hits, so a checkbox inside a label is
  measured as the label.
- `e2e/screens.visual.spec.ts` — a full-page baseline per screen per width, 22 in all
  (1.3 MB), committed under `e2e/screens.visual.spec.ts-snapshots/`. Eleven screen states,
  including the searched goods list and both a verdict with a checklist and one without.

Checked by mutation, to confirm the suites fail when something breaks:

| Change | Expected | Actual |
| --- | --- | --- |
| Remove `<Disclaimer />` from the result page | Result tests fail | 1 test failed |
| `deriveTrustState` treats "no source" as verified (breaks rule 3) | A trust test fails | 1 test failed |
| `--color-brand` teal to purple, rebuilt | Every phone baseline differs | 11 of 11 failed |

All three changes were reverted and the suites re-run green.

Two findings from the measurements. Neither was changed in this entry, because both looked
like design decisions for the team. **Both were fixed straight after; see the entry below.**

- **The header wordmark** ("CrossBorder Assist") is a 28 px-tall link, under the 44 px tap
  target rule (NFR-04, and `CLAUDE.md`). A one-line fix, but it changes header height.
- **The route strip's border name** renders at 12 px, below the 13 px floor the rest of the
  design system uses.

Both were named explicitly in `e2e/screens.layout.spec.ts` as exclusions rather than quietly
skipped, so the test recorded them instead of hiding them. Those exclusions are now gone.

Related and wider: NFR-05 and `CLAUDE.md` both ask for body text of at least 16 px, while
`DESIGN.md`, the design canvas and the code use 13 to 15 px for secondary text (badges, dates,
hints, source lines). Per `CLAUDE.md`, a disagreement between code, PRD and design gets
flagged rather than silently resolved, so the layout test guards the 13 px floor instead of
picking a side. The team should settle which document is right; if NFR-05 wins, it is a copy
and token change across most screens, and the baselines would be regenerated.

Still open after this entry (see the next entry for what the fixes closed):
- Real low-end Android devices on a slow connection. Unchanged: not done yet.
- Screen-reader walkthroughs by hand. The assertions cover names, roles and live regions,
  not whether the result screen is pleasant to listen to.
- Contrast ratios. Not measured; no axe or contrast tooling was added.
- Baselines are machine-dependent. They were rendered on a development laptop, so fonts and
  anti-aliasing may differ elsewhere; `maxDiffPixelRatio` is 0.01 to absorb that. If CI
  adopts them, regenerate there (`npm run test:visual:update`) or run in a container. A
  mismatch on another machine is not automatically a bug.
- The Swahili locale still does not exist; both suites pin to `en`.

## 2026-10-18 Tap target and type floor fixed

Closed the two findings from the entry above. Both turned out to be smaller decisions than
they looked, and in the second case `DESIGN.md` disagreed with itself.

**Header wordmark is now a 44 px tap target** (`src/components/site/site-header.tsx`). The
link keeps its 18 px/700 type and gains `flex min-h-11 items-center`, so the hit area meets
NFR-04 without the wordmark growing. Header padding went from 10 px to 6 px to pay for it,
which makes the site header **56 px at every width**: 8 px shorter than it was on desktop,
8 px taller than it was on phones. The old phone header was 48 px because only the wordmark
set its height; on desktop the Start button already forced 44 px, so desktop was 64 px and
the two never matched. `DESIGN.md` section 5 lists the site header as "added in code, not
yet designed", so no design decision was overridden here. The height is written into
`DESIGN.md` now so a review has something to argue with.

**Route strip border name is now 13 px** (`src/components/plan/route-strip.tsx`, `text-xs`
to `text-[13px]`). This one was a contradiction inside `DESIGN.md`, not between documents:
section 2 (Type) says "Never go below 13 px", while section 4 (Route strip) specified the
border marker name at 12 px. The general typographic rule wins over one component line, the
change is invisible at a glance, and 13 px is the size already used by badges, source lines,
the disclaimer, saved-plan dates and the bottom nav. `DESIGN.md` was corrected to 13 px with
a note, rather than leaving the two sections to disagree.

**The layout test got stricter, not looser.** `e2e/screens.layout.spec.ts` no longer carries
a `KNOWN_SMALL_TARGETS` exclusion for the wordmark, and the type-size test no longer skips
`aria-hidden` subtrees — small print is hard to read whether or not a screen reader
announces it, and the route strip is the only decorative text on the site.

Checked by mutation, both fixes reverted at once and the suite re-run:

| Change | Expected | Actual |
| --- | --- | --- |
| Wordmark back to 28 px and border name back to 12 px | Tap target and type tests fail | 12 failed on `phone-360`: 5 tap target (the five pages with the site header), 7 type size (every screen with a route strip) |

Reverted, rebuilt, and the full suite re-run: 202 Vitest tests in 16 files, and 77 Playwright
tests passed with 11 skipped (the touch rule on desktop).

**All 22 baselines were regenerated** against the corrected build. Ten exceeded the diff
tolerance on their own (the five header pages at both widths); the 1 px label change was
under `maxDiffPixelRatio` on the wizard and result screens, so those were rewritten with
`--update-snapshots=all` to keep every committed baseline byte-exact to what the app renders
rather than merely within tolerance of it. Two consecutive runs matched.

Still open, unchanged by this entry:
- **The 16 px body text disagreement is still open and still deliberate.** NFR-05 and
  `CLAUDE.md` ask for at least 16 px; `DESIGN.md` assigns 13 to 15 px to secondary text.
  That is a disagreement between the PRD and the design spec about what the product should
  be, not an internal contradiction, so per `CLAUDE.md` it goes to the team rather than
  getting picked here. Deciding it for NFR-05 is a token change across most screens plus a
  baseline regeneration. The layout test keeps guarding the 13 px floor meanwhile.
- Real low-end Android devices on a slow connection, screen-reader walkthroughs by hand,
  contrast ratios, machine-dependent baselines and the missing Swahili locale all stand as
  listed in the entry above.
