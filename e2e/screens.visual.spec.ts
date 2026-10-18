import { expect, test } from "@playwright/test";
import { SCREENS } from "./screens";

/**
 * Visual regression. One full-page baseline per screen per width, so a token change,
 * a stray margin or a broken layout shows up as a diff.
 *
 * Update baselines deliberately, never to make a red test green:
 *   npm run test:visual:update
 */
for (const { name, path } of SCREENS) {
  test(`${name} looks unchanged`, async ({ page }) => {
    await page.goto(path);

    // The fonts are self-hosted by next/font, so this settles without a network wait.
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("body")).toBeVisible();

    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}
