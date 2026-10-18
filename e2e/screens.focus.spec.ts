import { expect, test, type Page } from "@playwright/test";
import { SCREENS } from "./screens";

/**
 * Visible focus states (WCAG 2.1 AA, 2.4.7; NFR-06), which CLAUDE.md names alongside
 * labels and `aria-live` under "accessible by default". The other two are checked in jsdom;
 * this one needs a real browser, because jsdom applies no styles.
 *
 * Focus is moved with real Tab presses rather than `element.focus()`, so the test follows
 * the keyboard path a trader would and `:focus-visible` resolves the way it does in use.
 */

/** Properties that can make focus visible. `outline-offset` is excluded on purpose: on its
 *  own, with no outline drawn, it changes nothing a user can see. */
const FOCUS_SIGNAL = [
  "outlineStyle",
  "outlineWidth",
  "outlineColor",
  "boxShadow",
  "borderTopColor",
  "borderTopWidth",
  "backgroundColor",
  "color",
  "textDecorationLine",
] as const;

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/** A stop on the keyboard path: which control, how it looked, and how it looks focused. */
type Stop = { probe: number; label: string; before: string; after: string };

async function styleOfFocused(
  page: Page,
  signal: readonly string[],
): Promise<{ probe: number; label: string; style: string } | null> {
  return page.evaluate((properties) => {
    const node = document.activeElement;
    if (!node || node === document.body || !(node instanceof HTMLElement)) return null;
    const probe = node.dataset.focusProbe;
    if (probe === undefined) return null;
    const computed = getComputedStyle(node);
    return {
      probe: Number(probe),
      label: `${node.tagName.toLowerCase()} "${(node.textContent ?? "").trim().slice(0, 30)}"`,
      style: properties.map((p) => computed.getPropertyValue(p) || computed[p as never]).join("|"),
    };
  }, signal);
}

for (const { name, path } of SCREENS) {
  test(`${name} shows focus on every control the keyboard reaches`, async ({ page }) => {
    await page.goto(path);

    // Tag the controls and record how each looks while nothing is focused.
    const resting = await page.$$eval(
      FOCUSABLE,
      (nodes, { properties }) =>
        nodes.map((node, index) => {
          (node as HTMLElement).dataset.focusProbe = String(index);
          const computed = getComputedStyle(node);
          return properties
            .map((p) => computed.getPropertyValue(p) || computed[p as never])
            .join("|");
        }),
      { properties: FOCUS_SIGNAL as readonly string[] },
    );

    const stops: Stop[] = [];
    const seen = new Set<number>();
    // One press per control, plus a little slack for anything the browser adds.
    for (let press = 0; press < resting.length + 5; press += 1) {
      await page.keyboard.press("Tab");
      const focused = await styleOfFocused(page, FOCUS_SIGNAL);
      if (!focused) continue;
      if (seen.has(focused.probe)) break;
      seen.add(focused.probe);
      stops.push({
        probe: focused.probe,
        label: focused.label,
        before: resting[focused.probe],
        after: focused.style,
      });
    }

    // Without this, a page that never takes focus would read as a pass.
    expect(stops.length).toBeGreaterThan(0);
    expect(stops.filter((stop) => stop.before === stop.after)).toEqual([]);
  });
}
