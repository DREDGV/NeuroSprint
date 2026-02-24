import { expect, test } from "@playwright/test";

test.describe("NeuroSprint classes and themes", () => {
  test("teacher creates class and adds students", async ({ page }) => {
    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("Teacher");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByTestId("active-profile-status")).toContainText("Teacher");
    await expect(page.getByTestId("profiles-error")).toHaveCount(0);

    await page.goto("/classes");
    await page.getByTestId("class-name-input").fill("3А");
    await page.getByTestId("create-class-btn").click();
    await expect(page.getByTestId("class-select")).toHaveValue(/.+/);

    await page.fill("#bulk-students", "Анна\nБорис\nВера\nГлеб\nДана");
    await page.getByTestId("bulk-add-students-btn").click();

    await expect(page.locator('[data-testid="class-students-list"] .profile-item')).toHaveCount(5);
  });

  test("3x3 rainbow session completes", async ({ page }) => {
    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("Student");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByTestId("active-profile-status")).toContainText("Student");
    await expect(page.getByTestId("profiles-error")).toHaveCount(0);

    await page.goto("/training/schulte");
    await page.getByTestId("theme-rainbow").click();
    await page.getByTestId("setup-start-btn").click();

    const grid = page.getByTestId("schulte-grid");
    await expect(grid).toHaveAttribute("data-theme-id", "rainbow");

    await page.getByTestId("schulte-start").click();
    for (let i = 1; i <= 9; i += 1) {
      await page.getByRole("button", { name: String(i), exact: true }).click();
    }
    await expect(page.getByTestId("schulte-result")).toBeVisible();
  });
});
