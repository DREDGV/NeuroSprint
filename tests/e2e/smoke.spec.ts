import { expect, test } from "@playwright/test";

test.describe("NeuroSprint smoke", () => {
  test("first run: create profile -> classic -> stats", async ({ page }) => {
    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("TestUser1");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByTestId("active-profile-status")).toContainText("TestUser1");
    await expect(page.getByTestId("profiles-error")).toHaveCount(0);

    await page.goto("/");
    await expect(page.getByTestId("home-open-pre-session")).toBeVisible();
    await page.getByTestId("home-open-pre-session").click();
    await expect(page.getByTestId("schulte-setup-page")).toBeVisible();
    await page.getByTestId("setup-start-btn").click();

    for (let i = 1; i <= 9; i += 1) {
      await page.getByRole("button", { name: String(i), exact: true }).click();
    }
    await expect(page.getByTestId("schulte-result")).toBeVisible();

    await page.goto("/stats/individual");
    await expect(page.getByTestId("stats-individual-page")).toBeVisible();
  });

  test("home keeps optional pre-session path", async ({ page }) => {
    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("TestUser3");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByTestId("active-profile-status")).toContainText("TestUser3");

    await page.goto("/");
    await page.getByTestId("home-open-pre-session").click();
    await expect(page.getByTestId("pre-session-page")).toBeVisible();

    await page.getByTestId("pre-session-start-btn").click();
    await expect(page.getByTestId("schulte-setup-page")).toBeVisible();
  });

  test("timed mode completes and shows metrics", async ({ page }) => {
    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("TestUser2");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByTestId("active-profile-status")).toContainText("TestUser2");
    await expect(page.getByTestId("profiles-error")).toHaveCount(0);

    await page.goto("/training/schulte");
    await page.getByTestId("mode-timed_plus").click();
    await page.getByTestId("setup-start-btn").click();

    for (let i = 1; i <= 9; i += 1) {
      await page.getByRole("button", { name: String(i), exact: true }).click();
    }
    await expect(page.getByTestId("schulte-result")).toBeVisible({ timeout: 45_000 });
  });
});
