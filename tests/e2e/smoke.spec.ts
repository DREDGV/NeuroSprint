import { expect, test } from "@playwright/test";

test.describe("NeuroSprint smoke", () => {
  test("first run: create profile -> classic -> stats", async ({ page }) => {
    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("TestUser1");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByText("Активный профиль:")).toBeVisible();

    await page.goto("/play/schulte/classic");
    for (let i = 1; i <= 25; i += 1) {
      await page.getByRole("button", { name: String(i), exact: true }).click();
    }
    await expect(page.getByTestId("classic-result")).toBeVisible();

    await page.goto("/stats");
    await expect(page.getByTestId("stats-page")).toBeVisible();
  });

  test("timed mode completes and shows metrics", async ({ page }) => {
    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("TestUser2");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByText("Активный профиль:")).toBeVisible();

    await page.goto("/play/schulte/timed");
    await page.getByRole("button", { name: "30 с" }).click();
    await page.waitForSelector('[data-testid="timed-result"]', { timeout: 40_000 });
    await expect(page.getByTestId("timed-result")).toBeVisible();
  });
});
