import { expect, test } from "@playwright/test";

test.describe("Decision Rush", () => {
  test("profile -> training -> decision rush session -> stats", async ({ page }) => {
    await page.addInitScript(() => {
      const realNow = Date.now.bind(Date);
      const startedAt = realNow();
      const speedFactor = 40;
      Date.now = () => startedAt + (realNow() - startedAt) * speedFactor;
    });

    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("DecisionE2E");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByTestId("active-profile-status")).toContainText("DecisionE2E");

    await page.goto("/training");
    await page.getByTestId("training-open-decision_rush").click();
    await expect(page.getByTestId("decision-setup-page")).toBeVisible();

    await page.selectOption("[data-testid='decision-level-select']", "standard");
    await page.selectOption("[data-testid='decision-duration-select']", "45");
    await page.getByTestId("decision-start-btn").click();

    await expect(page.getByTestId("decision-session-page")).toBeVisible();
    await page.getByTestId("decision-start-session-btn").click();
    await expect(page.getByTestId("decision-live-state")).toContainText("Можно отвечать", {
      timeout: 8_000
    });

    const yes = page.getByTestId("decision-answer-yes");
    const no = page.getByTestId("decision-answer-no");
    const result = page.getByTestId("decision-result");

    for (let i = 0; i < 80; i += 1) {
      if (await result.isVisible()) {
        break;
      }

      const target = i % 2 === 0 ? yes : no;
      if (await target.isVisible() && await target.isEnabled()) {
        await target.click();
      }
      await page.waitForTimeout(45);
    }

    await expect(result).toBeVisible({ timeout: 12_000 });

    await page.goto("/stats");
    await page.getByTestId("stats-mode-decision-rush").click();
    await expect(page.getByTestId("stats-decision-rush-summary")).toBeVisible();
  });

  test("pre-session opens decision rush setup for selected mode", async ({ page }) => {
    await page.goto("/profiles");
    await page.getByTestId("profile-name-input").fill("DecisionPlan");
    await page.getByTestId("create-profile-btn").click();
    await expect(page.getByTestId("active-profile-status")).toContainText("DecisionPlan");

    await page.goto("/training/pre-session?module=decision_rush");
    await expect(page.getByTestId("pre-session-page")).toBeVisible();
    await page.getByTestId("pre-session-mode-decision_pro").click();
    await page.getByTestId("pre-session-start-btn").click();

    await expect(page.getByTestId("decision-setup-page")).toBeVisible();
    await expect(page).toHaveURL(/mode=decision_pro/);
  });
});
