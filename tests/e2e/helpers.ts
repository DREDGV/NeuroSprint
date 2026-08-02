import type { Page } from "@playwright/test";

export async function enableFeatureFlags(
  page: Page,
  flags: Record<string, boolean>
): Promise<void> {
  await page.addInitScript(
    ({ storageKey, enabledFlags }) => {
      localStorage.setItem(storageKey, JSON.stringify(enabledFlags));
    },
    {
      storageKey: "ns.featureFlags",
      enabledFlags: flags
    }
  );
}

export type TrainingSkillId =
  | "attention"
  | "memory"
  | "reaction"
  | "math"
  | "logic";

export async function openTrainingModuleFromHub(
  page: Page,
  skillId: TrainingSkillId,
  moduleId: string
): Promise<void> {
  await page.goto("/training");
  await page.getByTestId("training-hub-page").waitFor();
  await page.getByTestId(`training-skill-tab-${skillId}`).click();
  await page.getByTestId(`training-skill-panel-${skillId}`).waitFor();
  await page.getByTestId(`training-open-${moduleId}`).click();
  await page.getByTestId(`training-hero-start-${moduleId}`).click();
}
