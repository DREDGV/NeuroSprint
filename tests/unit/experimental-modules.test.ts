import { describe, expect, it } from "vitest";
import {
  EXPERIMENTAL_MODULES,
  getExperimentalModuleCurrentMilestone,
  getExperimentalModuleNextMilestone,
  getExperimentalModuleProgress,
  getExperimentalModulePromotionReadiness
} from "../../src/shared/lib/training/experimentalModules";

describe("experimentalModules", () => {
  it("keeps only unfinished prototype modules in the experimental registry", () => {
    expect(EXPERIMENTAL_MODULES).toHaveLength(1);
    expect(EXPERIMENTAL_MODULES[0]?.id).toBe("block_pattern");
  });

  it("derives progress from milestone statuses", () => {
    const blockPattern = EXPERIMENTAL_MODULES.find((item) => item.id === "block_pattern");

    expect(blockPattern).toBeDefined();
    expect(getExperimentalModuleProgress(blockPattern!)).toBe(81);
  });

  it("exposes current and next milestones for UI guidance", () => {
    const blockPattern = EXPERIMENTAL_MODULES.find((item) => item.id === "block_pattern");

    expect(blockPattern).toBeDefined();
    expect(getExperimentalModuleCurrentMilestone(blockPattern!)?.label).toBe("Обратная связь и обучение");
    expect(getExperimentalModuleNextMilestone(blockPattern!)?.label).toBe(
      "Проверка перед переводом в основные"
    );
  });

  it("derives promotion readiness without manual flags", () => {
    const blockPattern = EXPERIMENTAL_MODULES.find((item) => item.id === "block_pattern");

    expect(blockPattern).toBeDefined();
    expect(getExperimentalModulePromotionReadiness(blockPattern!)).toMatchObject({
      score: 71,
      tier: "not_ready",
      label: "Нужна доработка"
    });
  });
});
