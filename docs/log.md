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
