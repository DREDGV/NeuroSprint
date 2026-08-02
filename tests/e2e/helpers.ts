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
