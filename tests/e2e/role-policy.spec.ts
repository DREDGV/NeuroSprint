import { expect, test } from "@playwright/test";

test.describe("NeuroSprint role policy", () => {
  test("student role keeps training flow but restricts management actions", async ({ page }) => {
    await page.goto("/profiles");
    await expect(page.getByTestId("profiles-recovery-mode-note")).toBeVisible();

    await page.getByTestId("profile-name-input").fill("Teacher One");
    await page.getByTestId("profile-role-select").selectOption("teacher");
    await page.getByTestId("create-profile-btn").click();

    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem("ns.appRole")))
      .toBe("teacher");

    await page.getByTestId("profile-name-input").fill("Student One");
    await page.getByTestId("profile-role-select").selectOption("student");
    await page.getByTestId("create-profile-btn").click();

    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem("ns.appRole")))
      .toBe("student");

    await expect(page.getByTestId("profiles-create-role-note")).toBeVisible();
    await expect(page.getByTestId("profile-role-select")).toBeDisabled();
    await expect(page.getByTestId("profile-name-input")).toBeVisible();
    await expect(page.getByTestId("create-profile-btn")).toBeVisible();

    const roleEditors = page.locator('[data-testid^="profile-role-edit-"]');
    const roleSavers = page.locator('[data-testid^="save-profile-role-"]');
    await expect(roleEditors).toHaveCount(2);
    await expect(roleSavers).toHaveCount(2);
    await expect(roleEditors.first()).toBeDisabled();
    await expect(roleEditors.nth(1)).toBeDisabled();
    await expect(roleSavers.first()).toBeDisabled();
    await expect(roleSavers.nth(1)).toBeDisabled();

    await page.goto("/settings");
    await expect(page.getByTestId("dev-mode-role-note")).toBeVisible();
    await expect(page.getByTestId("export-role-note")).toBeVisible();
    await expect(page.getByTestId("app-role-select")).toBeDisabled();

    await page.goto("/stats/individual");
    await expect(page.getByTestId("individual-comparison-restricted-note")).toBeVisible();
    await expect(page.getByTestId("individual-comparison-block")).toHaveCount(0);

    await page.goto("/classes");
    await expect(page.getByTestId("permission-denied-panel")).toBeVisible();

    await page.goto("/stats/group");
    await expect(page.getByTestId("permission-denied-panel")).toBeVisible();

    await page.goto("/");
    await expect(page.getByTestId("nav-link-classes")).toHaveCount(0);
  });
});
