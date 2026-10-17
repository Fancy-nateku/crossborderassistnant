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
