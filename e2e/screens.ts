/** Every screen, with the URL a trader reaches it on. Shared by the browser specs. */
export const SCREENS = [
  { name: "landing", path: "/en" },
  { name: "how-it-works", path: "/en/how-it-works" },
  { name: "about", path: "/en/about" },
  { name: "help", path: "/en/help" },
  { name: "route-step-1", path: "/en/plan/route" },
  { name: "goods-step-2", path: "/en/plan/product" },
  { name: "goods-step-2-searched", path: "/en/plan/product?q=bean" },
  { name: "value-step-3", path: "/en/plan/value?qty=5&value=30000" },
  {
    name: "result-eligible",
    path: "/en/plan/result?from=KE&to=UG&border=busia&product=beans-dry&qty=5&unit=bags&currency=KES&value=30000",
  },
  {
    // No checklist for this verdict, so the layout differs.
    name: "result-cannot-confirm",
    path: "/en/plan/result?from=KE&to=UG&border=busia&product=maize-grain&qty=5&unit=bags&currency=KES&value=30000",
  },
  { name: "saved-plans", path: "/en/plans" },
] as const;
