import { expect, test } from "@playwright/test";
import { enableFeatureFlags } from "./helpers";

test.describe("NeuroSprint classes and themes", () => {
  test("teacher creates class and adds students", async ({ page }) => {
    await enableFeatureFlags(page, { classes_ui: true });

    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("Teacher");
    await page.getByTestId("profile-role-select").selectOption("teacher");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByTestId("active-profile-status")).toContainText("Teacher");
    await expect(page.getByTestId("profiles-error")).toHaveCount(0);

    await page.goto("/classes");
    await page.getByTestId("class-name-input").fill("3А");
    await page.getByTestId("create-class-btn").click();

    await expect(page.getByTestId("classes-list")).toBeVisible();
    await expect(page.locator('[data-testid^="class-card-"]')).toHaveCount(1);

    await expect(page.getByTestId("student-name-input")).toBeVisible();

    const names = ["Анна", "Борис", "Вера", "Глеб", "Дана"];
    for (const name of names) {
      await page.getByTestId("student-name-input").fill(name);
      await page.getByTestId("create-student-btn").click();
      await expect(page.getByTestId("student-name-input")).toHaveValue("");
    }

    await expect(page.locator('[data-testid="students-list"] article')).toHaveCount(5, { timeout: 15_000 });
  });

  test("3x3 rainbow session completes", async ({ page }) => {
    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("Student");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByTestId("active-profile-status")).toContainText("Student");
    await expect(page.getByTestId("profiles-error")).toHaveCount(0);

    await page.goto("/training/schulte");
    await page.getByTestId("toggle-advanced-btn").click();
    await page.getByTestId("theme-rainbow").click();
    await page.getByTestId("setup-start-btn").click();

    const grid = page.getByTestId("schulte-grid");
    await expect(grid).toHaveAttribute("data-theme-id", "rainbow");

    for (let i = 1; i <= 9; i += 1) {
      await page.getByRole("button", { name: String(i), exact: true }).click();
    }
    await expect(page.getByTestId("schulte-result")).toBeVisible();
  });
});
