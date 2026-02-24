import { expect, test } from "@playwright/test";

test.describe("NeuroSprint benchmark", () => {
  test("dev tools are hidden by default", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByTestId("dev-tools-hidden-note")).toBeVisible();
    await expect(page.getByTestId("generate-demo-fixture-btn")).toHaveCount(0);
  });

  test("settings benchmark generates period report", async ({ page }) => {
    await page.goto("/settings");
    page.on("dialog", (dialog) => dialog.accept());

    const devToggle = page.getByTestId("dev-mode-toggle");
    if (!(await devToggle.isChecked())) {
      await devToggle.click();
    }
    await page.getByTestId("save-settings-btn").click();

    await page.getByTestId("generate-demo-fixture-btn").click();
    const fixtureStatus = page.getByTestId("fixture-status-message");
    await expect(fixtureStatus).toBeVisible({ timeout: 45_000 });
    await expect(fixtureStatus).toContainText("Демо-данные созданы");

    await page.getByTestId("run-benchmark-btn").click();
    const report = page.getByTestId("benchmark-report");
    await expect(report).toBeVisible({ timeout: 45_000 });
    await expect(report).toContainText("[30d]");
    await expect(report).toContainText("[90d]");
    await expect(report).toContainText("[all]");
    await expect(report).toContainText("Итог:");
  });
});
