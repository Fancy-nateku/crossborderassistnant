import { expect, test } from "@playwright/test";

test("a guest can preview, save and reopen a plan on this device", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const protectedPlanRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => failedRequests.push(request.url()));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.includes("/api/v1/saved-plans")) {
      protectedPlanRequests.push(request.url());
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
  await expect(page.getByRole("button", { name: "Save plan" })).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in/i })).toHaveCount(0);
  await expect(page.getByText("No verified checklist for this case.")).toBeVisible();

  await page.getByRole("button", { name: "Save plan" }).click();
  await expect(page.getByText("Plan saved on this device.")).toBeVisible();
  await expect(page.getByText(/do not sync across devices/)).toBeVisible();

  await page.getByRole("link", { name: "View in Saved Plans" }).click();
  await expect(page).toHaveURL(/\/en\/plans/);
  await expect(page.getByText(/stored only on this device/)).toBeVisible();
  const savedPlan = page.getByRole("link", { name: /Goods not matched, to Uganda/ });
  await expect(savedPlan).toBeVisible();
  await savedPlan.click();
  await expect(page).toHaveURL(/\/en\/plan\/result/);
  await expect(page.getByRole("heading", { name: "Your trade plan" })).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(protectedPlanRequests).toEqual([]);
});
