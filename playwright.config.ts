import { defineConfig, devices } from "@playwright/test";

/**
 * Browser checks for the things jsdom cannot see: layout, sizes and how each screen
 * actually looks. Unit and component tests stay in Vitest (`npm test`).
 *
 * Screenshot baselines are rendered by the browser, so they are machine-dependent:
 * fonts and anti-aliasing differ between a laptop and CI. `maxDiffPixelRatio` absorbs
 * small differences; a baseline mismatch on another machine is not automatically a bug.
 * See docs/log.md.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },

  expect: {
    // Enough for font smoothing, not enough to hide a layout change.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled", scale: "css" },
  },

  projects: [
    {
      // The phone width DESIGN.md designs from. Our users are on low-end Android.
      name: "phone-360",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 740 } },
    },
    {
      name: "desktop-1280",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],

  // A production build, so what is measured is what a trader would be served.
  // Port 3100, so it does not collide with a dev server on the usual 3000.
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100/en",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
