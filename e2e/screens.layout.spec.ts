import { expect, test, type Page } from "@playwright/test";
import { SCREENS } from "./screens";

/**
 * The layout rules from CLAUDE.md that need a real layout engine: one-handed use at
 * 360 px and tap targets of at least 44 px. Structure and naming are checked in jsdom
 * (`src/app/[locale]/screens.a11y.test.tsx`).
 */

/** DESIGN.md, Type: "Never go below 13 px." CLAUDE.md asks for 16 px body text while
 *  DESIGN.md uses 13 to 15 px for secondary text (badges, dates, source lines); that
 *  disagreement is for the team, so this guards the stated floor rather than picking a
 *  side. Decorative text counts too: small print is hard to read whether or not a screen
 *  reader announces it. */
const SMALLEST_TEXT_PX = 13;

type TapTarget = { tag: string; text: string; width: number; height: number };

/**
 * The area a finger actually hits. A checkbox or radio inside a label is hit through the
 * whole label, so that box is what gets measured.
 */
async function tapTargets(page: Page): Promise<TapTarget[]> {
  return page.$$eval(
    "a, button, input:not([type=hidden]), select, [role=button]",
    (nodes) =>
      nodes
        .map((node) => {
          const style = getComputedStyle(node);
          if (style.display === "none" || style.visibility === "hidden") return null;

          // Inline links sit in text flow and cannot be 44 px tall without breaking the
          // paragraph around them, so they are not tap targets in the layout sense.
          if (node.closest("p")) return null;

          const label = node.closest("label");
          const box = (label ?? node).getBoundingClientRect();
          return {
            tag: node.tagName.toLowerCase(),
            text: (node.textContent ?? "").trim().slice(0, 40),
            width: Math.round(box.width),
            height: Math.round(box.height),
          };
        })
        .filter(
          (box): box is TapTarget => box !== null && box.width > 0 && box.height > 0,
        ),
  );
}

for (const { name, path } of SCREENS) {
  test.describe(name, () => {
    test("fits the viewport without sideways scrolling", async ({ page }) => {
      await page.goto(path);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      // 1 px of rounding is tolerated; a real overflow runs to tens of pixels.
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test("gives every tap target at least 44 px", async ({ page }, testInfo) => {
      // A touch rule, so it is checked at phone width. With a mouse at 1280 px the
      // checklist rows are 587 px wide and one line tall, which is fine to click.
      test.skip(testInfo.project.name !== "phone-360", "Touch target rule applies to phones.");
      await page.goto(path);

      const targets = await tapTargets(page);
      expect(targets.length).toBeGreaterThan(0);
      expect(targets.filter((t) => t.height < 44)).toEqual([]);
    });

    test("never drops text below the smallest size in the design system", async ({ page }) => {
      await page.goto(path);

      const tooSmall = await page.$$eval(
        "body *",
        (nodes, floor) =>
          nodes
            .filter((node) =>
              [...node.childNodes].some(
                (child) => child.nodeType === Node.TEXT_NODE && (child.textContent ?? "").trim(),
              ),
            )
            .map((node) => ({
              text: (node.textContent ?? "").trim().slice(0, 40),
              size: Number.parseFloat(getComputedStyle(node).fontSize),
            }))
            .filter((item) => item.size < floor),
        SMALLEST_TEXT_PX,
      );
      expect(tooSmall).toEqual([]);
    });
  });
}
