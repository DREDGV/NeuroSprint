import { expect, test } from "@playwright/test";

test.describe("NeuroSprint Sprint Math", () => {
  test("setup -> session -> finish -> stats sprint mode", async ({ page }) => {
    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("SprintUser1");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByTestId("active-profile-status")).toContainText("SprintUser1");

    await page.goto("/training");
    await expect(page.getByTestId("training-hub-page")).toBeVisible();
    await page.getByTestId("training-open-sprint_math").click();
    await expect(page.getByTestId("sprint-math-setup-page")).toBeVisible();
    await page.getByTestId("sprint-math-start-btn").click();

    await expect(page.getByTestId("sprint-math-session-page")).toBeVisible();
    await page.getByTestId("sprint-math-submit-btn").click();
    await page.getByTestId("sprint-math-finish-btn").click();
    await expect(page.getByTestId("sprint-math-result")).toBeVisible();
    await expect(page.getByTestId("sprint-math-save-status")).toHaveText("saved", {
      timeout: 10_000
    });

    await page.goto("/stats");
    await page.getByTestId("stats-mode-sprint").click();
    await expect(page.getByTestId("stats-mode-sprint")).toHaveClass(/is-active/);

    await page.goto("/stats/individual");
    await expect(page.getByTestId("stats-individual-page")).toBeVisible();
    await page.getByRole("button", { name: "Сложение/вычитание" }).click();
    await expect(page.getByTestId("sprint-individual-insights")).toBeVisible();
  });
});