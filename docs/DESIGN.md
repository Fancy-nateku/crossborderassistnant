# CrossBorder Assist — Design Spec (v0.1)

The visual source of truth is the team's design canvas ("CrossBorder Assist — Core Flow v0.1"). This file translates it into rules and component specs that code can follow. If the canvas and this file disagree, raise it in the PR; don't guess.

Screens are **hypotheses for validation testing**. Build them so copy and layout are easy to change after interviews.

## 1. Design principles

1. **Plain and serious.** This is a tool people rely on at a border, not a marketing site. No gradients, no shadows, no illustrations, no hero images, no decorative shapes.
2. **One accent colour.** Teal is used only for things you can act on or things that are selected. Everything else is white, near-black or neutral grey.
3. **Colour carries meaning only in trust badges.** Verified, Not re-checked, Sources disagree, Cannot confirm. Nothing else may use those colours.
4. **One question per screen** in the wizard. One primary button per screen.
5. **Say when we don't know.** Unknown and conflicting states are designed as first-class states, not error afterthoughts.
6. **Built for a cheap Android phone in the sun.** 360 px first, 16 px minimum body text, 44 px minimum tap targets, high contrast.

## 2. Tokens

### Colour

| Token | Hex | Use |
| --- | --- | --- |
| `brand` | #17767B | Primary buttons, links, selected borders, radio/checkbox accent, verdict heading, focus ring |
| `brand-dark` | #0E5458 | Hover and pressed states of `brand` |
| `surface` | #FAFAF9 | Page background |
| `panel` | #FFFFFF | Cards, header, footer bars, inputs |
| `muted` | #F2F2F0 | Selected option background, neutral info panels, step number circles |
| `line` | #E3E3E0 | Card and divider borders |
| `line-strong` | #C9C9C5 | Input borders, unselected option borders, dashed route line |
| `ink` | #1A1A1A | Headings and body text |
| `ink-muted` | #5C5C5C | Secondary text, captions, helper text |

### Trust-state colours (badges and callouts only)

| State | Background | Text | Badge label | Callout title |
| --- | --- | --- | --- | --- |
| verified | #EAF4DA | #3F6B12 | Verified | — (badge only) |
| unverified | #FBEFD9 | #7A4900 | Not re-checked | Not re-checked recently |
| conflicting | #FBE5DB | #9A3510 | Sources disagree | Sources disagree on … |
| unknown | #E8ECEF | #3E4A52 | Cannot confirm | Not sure about something? |

Callout body text uses a darker shade of the same hue: unverified #4F3000, conflicting #5C2208.

### Type

- Family: **Atkinson Hyperlegible** (Google Fonts, 400 and 700), fallback `'Segoe UI', system-ui, sans-serif`. Chosen for legibility for low-vision readers and outdoor use.
- Load with `next/font/google`, `display: swap`, latin subset only.

| Role | Size / line height | Weight |
| --- | --- | --- |
| Page title (h1) | 28 px / 1.15 (landing hero 34 px / 1.12) | 700 |
| Section title (h2) | 22 px / 1.2 | 700 |
| Card title | 18 px / 1.3 | 700 |
| Body | 16–17 px / 1.45–1.5 | 400 |
| Label | 15 px | 700 |
| Helper / caption | 14 px / 1.45 | 400, `ink-muted` |
| Disclaimer, source line | 13 px / 1.5 | 400, `ink-muted` |
| Badge | 13 px | 700 |

Never go below 13 px. Sentence case everywhere. No all-caps labels.

### Shape and spacing

- Radius: **8 px** on cards, buttons, inputs, option rows, panels. **6 px** on badges. No pills, no fully rounded buttons. Step-number circles and the route dot are the only circles.
- Borders: 1 px `line` for cards; 1.5 px `line-strong` for inputs and unselected options; 2 px `brand` for selected options and focused inputs; verdict card 1.5 px `brand`.
- No box-shadows anywhere. No dashed borders except the route line and the "Other crossings" not-covered row.
- Spacing scale (px): 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32. Page side padding 20 px. Gap between stacked cards 10–12 px.

## 3. Layout

- Mobile-first. Design width 390 px, must work at 360 px. On wider screens the wizard column grows: 480 px on phones, 720 px from 768 px, 880 px from 1024 px. Content pages and the result screen use up to 1120 px (1200 px from 1280 px). Admin screens may use up to 1200 px. See `docs/log.md` (2026-10-18).
- Content pages (landing, How it works, About, Help, Saved plans): **site header** (wordmark + page links + Start from 768 px; wordmark only on phones) → main → **site footer** (links + disclaimer). On phones a **bottom tab bar** (Home, How, Start, Saved, Help) replaces the header links. The wizard and result screens do not use it.
- Wizard screens: **header bar** (back button + "Step N of 3") → **route strip** → **main** → **sticky footer** with the single primary button.
- Result screen: header → route strip (full) → verdict card → checklist → actions → help panel → disclaimer. Page scrolls; no sticky footer.

## 4. Components

### Header bar
White `panel`, 1 px bottom `line`. Back link is a 44×44 icon button (`aria-label="Back"`, chevron stroke icon, 2.2 px stroke) followed by 16 px/700 step text. Landing variant: wordmark "CrossBorder Assist" 18 px/700 in `brand` + language button. The wordmark is a link, so its hit area is 44 px tall; with 6 px padding the site header is 56 px on every width.

### Route strip (signature element)
Shows where the user is in the journey as a trip from Kenya to Uganda.
- Row: "Kenya" label · track · "Uganda" label. Labels 14 px/700; start label `brand`, end label `ink-muted` until the result screen, then `brand`.
- Track: 2 px dashed `line-strong` full width; solid 4 px `brand` progress bar from the left.
- Border marker: 3×24 px `ink` bar at 68% with "Busia" (13 px, `ink-muted`) beneath. The marker name comes from the selected border. (Was 12 px, which contradicted the 13 px floor above; see `docs/log.md` 2026-10-18.)
- Position dot: 14 px circle, `panel` fill, 2 px `brand` border, at the progress end.
- Progress by screen: step 1 = 18%, step 2 = 38%, step 3 = 58%, result = 100%.
- Decorative: wrap in `aria-hidden="true"` and expose progress as text ("Step 2 of 3") in the header.

### Buttons
- **Primary:** `brand` background, white 18 px/700 text, min-height 56 px (48 px for secondary placements), full width, 8 px radius. Hover/pressed `brand-dark`. One per screen.
- **Secondary:** `panel` background, 1.5 px `brand` border, `brand` text, min-height 48–52 px.
- Links styled as buttons are `<a>` elements; actions are `<button>`. No `onClick` on divs.

### Inputs
- Label above, 15 px/700, always visible (no placeholder-as-label).
- Field: min-height 52 px, 1.5 px `line-strong` border, 8 px radius, 17 px text. Focus: 2 px `brand` border + visible focus ring.
- **Currency + value input:** one bordered group (2 px `brand` when active). Left: segmented KES / UGX toggle buttons (`aria-pressed`), selected = `brand` fill, white text. Right: numeric text input (`inputmode="numeric"`), 22 px/700, with an accessible label naming the currency.

### Option row (radio card)
Used for border choice and product results. Whole row is the `<label>`; real `<input type="radio">` (22 px, `accent-color: brand`) on the left. Min-height 64 px, 16 px padding.
- Unselected: `panel` fill, 1.5 px `line-strong`.
- Selected: `muted` fill, 2 px `brand` border.
- Product rows add: name (17 px/700), local name line ("Also called …", 14 px `ink-muted`), and a Common List badge (see Badge).
- Not-covered row: dashed 1.5 px `line-strong`, no radio, `ink-muted` text.

### Badge
6 px radius, 3–4 px × 9–10 px padding, 13 px/700, trust-state colours from §2. Product Common List badges map: on list → verified colours ("On the Common List"), not on list → conflicting colours ("Not on the Common List"), unknown → unknown colours ("List status unknown").

### Verdict card
`panel` fill, 1.5 px `brand` border, 8 px radius, 18 px padding, `aria-live="polite"`.
- "Our verdict" 15 px `ink-muted`
- Verdict heading (h1) 28 px/700 `brand`
- Summary sentence: product, quantity, value, route and border
- Caveat line 14 px `ink-muted`: "This is guidance, not clearance. Border officials make the final decision."

Verdict copy by outcome:

| Outcome | Heading |
| --- | --- |
| `likely_str_eligible` | Likely eligible for the Simplified Trade Regime |
| `above_threshold` | Above USD 2,000: the standard customs procedure applies |
| `not_on_common_list` | This product is not on the Common List |
| `cannot_confirm` | We can't confirm the rules for this trade |

For `cannot_confirm`, the heading uses `ink` (not `brand`) and the checklist shows only official contacts.

### Checklist item
White card, 1 px `line`, 16 px padding, 10 px internal gap.
1. Checkbox row: real checkbox 24 px (`accent-color: brand`) + title 18 px/700, in one `<label>`.
2. Plain explanation, 15 px `ink-muted`, indented 36 px to align with the title.
3. Optional facts (indented): "Where: …", "Official fee: …" 14 px.
4. Trust footer (indented), one of:
   - verified → badge + "Source name, checked DD Mon YYYY" (13 px `ink-muted`, source name links out)
   - unverified / conflicting → full-width callout with title + body in that state's colours, then the source line
5. Progress count in the section header: "N of M done", 15 px `ink-muted`.

### Help panel
`unknown` background, 8 px radius, 16 px padding. Title "Not sure about something?" 16 px/700; body names the Trade Information Desk at the selected border plus its contact details.

### Disclaimer
13 px `ink-muted`, at the end of every result page and the landing page:
"This platform provides informational decision support based on referenced sources. It is not a customs authority, legal adviser, tax authority or government service. Verify current requirements with the relevant official authority before you trade."

### Saved plan card
`<a>` card, white, 1 px `line`. Title "Product to Country" 18 px/700; route line 15 px `ink-muted`; progress bar (8 px tall, `muted` track, `brand` fill) with "N of M done"; saved date 13 px. If a rule in the plan changed since saving: an unverified-coloured notice "A rule in this plan changed since you saved it. Open to see what is new."

## 5. Screens

| # | Screen | Route | Key content |
| --- | --- | --- | --- |
| 1 | Landing | `/[locale]` | Header with wordmark + language button. White hero: h1 "Know what you need before you reach the border.", one paragraph, route strip at 0%, primary "Build your trade plan", note "No account needed to see your checklist." Then "Three questions, one checklist" numbered list (route, goods, value), trust-badge explainer card, secondary "Open saved plans", disclaimer. |
| 2 | Route and border | `/[locale]/plan/route` | h1 "Where are you taking your goods?" From/To selects (Kenya / Uganda). Fieldset "Which crossing?": Busia (selected, "One-stop border post"), Malaba, dashed "Other crossings — not covered yet" row. Footer: "Next: your goods". |
| 3 | Product | `/[locale]/plan/product` | h1 "What are you taking?" Search "Search by any name you use". Result count. Product option rows with local name and Common List badge. Escape link "Can't find it? Continue without a match". Footer: "Next: value". |
| 4 | Value | `/[locale]/plan/value` | h1 "How much are you taking, and what is it worth?" Quantity + unit (Bags, Kilograms, Crates). Currency/value group. USD conversion panel showing amount, rate and the date the team set it, with "Customs may use a different rate." Neutral `muted` note about the USD 2,000 STR threshold. Footer: "See my checklist". |
| 5 | Verdict and checklist | `/[locale]/plan/result` | Verdict card, "Your checklist" with items and trust states, primary "Save plan", secondary "Share to WhatsApp", note "You will be asked to sign in when you save.", help panel, disclaimer. |
| 6 | Saved plans | `/[locale]/plans` | Header with wordmark + signed-in identifier. h1 "Saved plans", plan cards, footer "Build a new plan". Empty state: "No saved plans yet." + primary "Build your trade plan". |

Added in code, not yet designed (need design review): **How it works** (`/how-it-works`), **About** (`/about`), **Help** (`/help`, short FAQ), the site header and footer, and the phone bottom tab bar.

Not yet designed (build plainly with the same components, then bring to design review): Sign in, Requirement detail, Admin rules, Admin source registry.

## 6. Copy rules

- Plain words, short sentences, second person ("your goods").
- Buttons say what happens next ("Next: your goods", "Save plan"); the same action keeps the same name across the flow.
- Never say "approved", "cleared", "guaranteed" or "allowed". Say "likely eligible", "applies", "check with".
- Every number that comes from a rule shows its source and date.
- All strings live in `messages/{locale}.json`; none in components.

## 7. Accessibility checklist

- Real `<button>`, `<a href>`, `<input>` + `<label>`; fieldset/legend for radio groups.
- Visible focus ring (2 px `brand`, 2 px offset) on every interactive element.
- Contrast: all text pairs above meet 4.5:1 on their backgrounds; don't introduce new pairs without checking.
- Colour never carries meaning alone: every badge has a text label.
- Verdict card is `aria-live="polite"`; route strip is `aria-hidden`.
- Respect `prefers-reduced-motion` (there is no motion planned; keep it that way).

## 8. What not to do

- No gradients, shadows, glassmorphism, background images or illustrations.
- No second brand colour, no yellow/orange accents outside trust states.
- No icon libraries; the few icons (back chevron, search, share) are inline stroke SVGs.
- No carousels, modals for core flow, or toasts as the only feedback.
- No placeholder text as labels.
