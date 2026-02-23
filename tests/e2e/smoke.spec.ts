import { expect, test } from "@playwright/test";

test.describe("NeuroSprint smoke", () => {
  test("first run: create profile -> classic -> stats", async ({ page }) => {
    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("TestUser1");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByText("Активный профиль:")).toBeVisible();

    await page.goto("/training/schulte");
    await page.getByRole("button", { name: "Classic+" }).click();
    await page.getByRole("button", { name: "Начать тренировку" }).click();
    await page.getByTestId("schulte-start").click();
    for (let i = 1; i <= 25; i += 1) {
      await page.getByRole("button", { name: String(i), exact: true }).click();
    }
    await expect(page.getByTestId("schulte-result")).toBeVisible();

    await page.goto("/stats/individual");
    await expect(page.getByTestId("stats-individual-page")).toBeVisible();
  });

  test("timed mode completes and shows metrics", async ({ page }) => {
    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("TestUser2");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByText("Активный профиль:")).toBeVisible();

    await page.goto("/training/schulte");
    await page.getByRole("button", { name: "Timed+" }).click();
    await page.getByRole("button", { name: "Расширенные параметры" }).click();
    await page.selectOption("#time-limit", "30");
    await page.getByRole("button", { name: "Начать тренировку" }).click();
    await page.getByTestId("schulte-start").click();
    await page.waitForSelector('[data-testid="schulte-result"]', { timeout: 45_000 });
    await expect(page.getByTestId("schulte-result")).toBeVisible();
  });
});
