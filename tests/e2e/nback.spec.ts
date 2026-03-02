import { expect, test } from "@playwright/test";

test.describe("N-Back Lite", () => {
  test("profile -> training -> nback session -> stats", async ({ page }) => {
    await page.addInitScript(() => {
      const realNow = Date.now.bind(Date);
      const startedAt = realNow();
      const speedFactor = 40;
      Date.now = () => startedAt + (realNow() - startedAt) * speedFactor;
    });

    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("NBackE2E");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByTestId("active-profile-status")).toContainText("NBackE2E");

    await page.goto("/training");
    await page.getByTestId("training-open-n_back").click();
    await expect(page.getByTestId("nback-setup-page")).toBeVisible();

    await page.selectOption("[data-testid='nback-level-select']", "1");
    await page.selectOption("[data-testid='nback-duration-select']", "60");
    await page.getByTestId("nback-start-btn").click();

    await expect(page.getByTestId("nback-session-page")).toBeVisible();
    await page.getByTestId("nback-start-session-btn").click();
    await expect(page.getByTestId("nback-result")).toBeVisible({ timeout: 20_000 });

    await page.goto("/stats");
    await page.getByTestId("stats-mode-nback").click();
    await expect(page.getByTestId("stats-nback-summary")).toBeVisible();
  });

  test("pre-session opens nback setup for selected mode", async ({ page }) => {
    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("NBackPlan");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByTestId("active-profile-status")).toContainText("NBackPlan");

    await page.goto("/training/pre-session?module=n_back");
    await expect(page.getByTestId("pre-session-page")).toBeVisible();
    await page.getByTestId("pre-session-mode-nback_2").click();
    await page.getByTestId("pre-session-start-btn").click();
    await expect(page.getByTestId("nback-setup-page")).toBeVisible();
    await expect(page).toHaveURL(/mode=nback_2/);
  });
});
