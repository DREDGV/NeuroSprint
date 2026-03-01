import { expect, test } from "@playwright/test";

test.describe("NeuroSprint Reaction module", () => {
  test("opens reaction training and runs choice variant with live timer", async ({ page }) => {
    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("ReactionUser");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByTestId("active-profile-status")).toContainText("ReactionUser");
    await expect(page.getByTestId("profiles-error")).toHaveCount(0);

    await page.goto("/training");
    await expect(page.getByTestId("training-hub-page")).toBeVisible();
    await page.getByTestId("training-open-reaction").click();

    await expect(page.getByTestId("reaction-page")).toBeVisible();
    await expect(page.getByTestId("reaction-how-to")).toBeVisible();
    await expect(page.getByTestId("reaction-live-timer")).toContainText("Ожидание");
    await expect(page.getByTestId("reaction-status")).toContainText("Нажмите");

    await page.getByTestId("reaction-start-btn").click();
    await expect(page.getByTestId("reaction-live-timer")).toContainText("До сигнала");

    await page.getByTestId("reaction-variant-stroop_match").click();
    await page.getByTestId("reaction-start-btn").click();
    await expect(page.getByTestId("reaction-challenge")).toBeVisible({ timeout: 7000 });
    await page.getByTestId("reaction-option-0").click();
    await expect(page.getByTestId("reaction-status")).toContainText("Попытка");
  });

  test("pre-session route opens reaction page with selected variant", async ({ page }) => {
    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("ReactionPreSessionUser");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByTestId("active-profile-status")).toContainText("ReactionPreSessionUser");
    await expect(page.getByTestId("profiles-error")).toHaveCount(0);

    await page.goto("/training/pre-session?module=reaction");
    await expect(page.getByTestId("pre-session-page")).toBeVisible();
    await page.getByTestId("pre-session-mode-reaction_pair").click();
    await page.getByTestId("pre-session-start-btn").click();

    await expect(page.getByTestId("reaction-page")).toBeVisible();
    await expect(page.getByTestId("reaction-variant-pair_match")).toHaveClass(/is-active/);
  });
});
