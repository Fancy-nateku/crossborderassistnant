import { expect, test } from "@playwright/test";

test("a signed-out visitor can build a plan, and is asked to sign in only to save it", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const savedPlanRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => failedRequests.push(request.url()));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.includes("/api/v1/saved-plans")) {
      savedPlanRequests.push(request.url());
    }
  });

  await page.goto("/en/plan/route");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/\/en\/plan\/product/);

  await page.getByRole("link", { name: "Skip this step" }).click();
  await expect(page).toHaveURL(/\/en\/plan\/value/);
  await page.getByLabel("Quantity").fill("5");
  await page.getByLabel("Total value in Kenyan shillings").fill("30000");
  await page.getByRole("button", { name: "See my checklist" }).click();

  await expect(page).toHaveURL(/\/en\/plan\/result/);
  await expect(page.getByRole("heading", { name: "Your trade plan" })).toBeVisible();
  await expect(page.getByText("No verified checklist for this case.")).toBeVisible();

  // Plans are saved to the account only: signed out, Save becomes "Sign in to save".
  await expect(page.getByRole("button", { name: "Save plan" })).toHaveCount(0);
  const signIn = page.getByRole("link", { name: "Sign in to save this plan" });
  await expect(signIn).toBeVisible();
  await expect(signIn).toHaveAttribute("href", /\/login\?next=/);

  await page.goto("/en/plans");
  await expect(page.getByRole("heading", { name: "Sign in to see your saved plans" })).toBeVisible();

  await page.getByRole("link", { name: "Sign in", exact: true }).first().click();
  await expect(page).toHaveURL(/\/en\/login/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(savedPlanRequests).toEqual([]);
});
