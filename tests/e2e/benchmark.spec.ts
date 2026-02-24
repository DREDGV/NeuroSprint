import { expect, test } from "@playwright/test";

test.describe("NeuroSprint benchmark", () => {
  test("settings benchmark generates period report", async ({ page }) => {
    await page.goto("/settings");
    page.on("dialog", (dialog) => dialog.accept());

    await page.getByTestId("generate-demo-fixture-btn").click();
    await expect(page.getByText(/Демо-данные созданы:/)).toBeVisible({
      timeout: 45_000
    });

    await page.getByTestId("run-benchmark-btn").click();
    const report = page.getByTestId("benchmark-report");
    await expect(report).toBeVisible({ timeout: 45_000 });
    await expect(report).toContainText("[30d]");
    await expect(report).toContainText("[90d]");
    await expect(report).toContainText("[all]");
    await expect(report).toContainText("Итог:");
  });
});
