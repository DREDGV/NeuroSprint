import { expect, test } from "@playwright/test";

test.describe("NeuroSprint comparisons", () => {
  test("fixture generation enables individual and group comparison blocks", async ({ page }) => {
    await page.goto("/settings");
    await page.getByTestId("generate-demo-fixture-btn").click();
    await expect(page.getByText(/Демо-данные созданы:/)).toBeVisible({ timeout: 45_000 });

    await page.goto("/stats/individual");
    await expect(page.getByTestId("stats-individual-page")).toBeVisible();
    await expect(page.getByTestId("individual-comparison-block")).toBeVisible();
    await expect(page.getByText("Все пользователи")).toBeVisible();

    const individualValues = page.locator(
      '[data-testid="individual-comparison-block"] .stat-card-value'
    );
    await expect(individualValues.first()).not.toHaveText("—");

    await page.goto("/stats/group");
    await expect(page.getByTestId("stats-group-page")).toBeVisible();
    await expect(page.getByTestId("group-comparison-block")).toBeVisible();
    await expect(page.getByText("Сравнение групп и общей статистики")).toBeVisible();

    const groupValues = page.locator('[data-testid="group-comparison-block"] .stat-card-value');
    await expect(groupValues.first()).not.toHaveText("—");
  });
});
