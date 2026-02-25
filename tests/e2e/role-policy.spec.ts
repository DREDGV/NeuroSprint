import { expect, test } from "@playwright/test";

test.describe("NeuroSprint role policy", () => {
  test("student role keeps training flow but restricts management actions", async ({ page }) => {
    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("PolicyUser");
    await page.getByTestId("create-profile-btn").click();

    await expect(page.getByTestId("active-profile-status")).toContainText("Ученик");
    await expect(page.getByTestId("profiles-create-role-note")).toBeVisible();
    await expect(page.getByTestId("profile-name-input")).toBeVisible();
    await expect(page.getByTestId("create-profile-btn")).toBeVisible();
    await expect(page.locator('[data-testid^="profile-role-edit-"]')).toHaveCount(0);

    await page.goto("/settings");
    await expect(page.getByTestId("dev-mode-role-note")).toBeVisible();
    await expect(page.getByTestId("export-role-note")).toBeVisible();
    await expect(page.getByTestId("app-role-select")).toBeDisabled();

    await page.goto("/stats/individual");
    await expect(page.getByTestId("individual-comparison-restricted-note")).toBeVisible();
    await expect(page.getByTestId("individual-comparison-block")).toHaveCount(0);

    await page.goto("/classes");
    await expect(page.getByTestId("permission-denied-panel")).toBeVisible();
    await expect(page.getByText(/выберите роль: Учитель/i)).toBeVisible();

    await page.goto("/stats/group");
    await expect(page.getByTestId("permission-denied-panel")).toBeVisible();

    await page.goto("/");
    await expect(page.getByTestId("nav-link-classes")).toHaveCount(0);
  });
});
