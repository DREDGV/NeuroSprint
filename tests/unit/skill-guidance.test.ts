import { describe, expect, it } from "vitest";
import { buildSkillGuidance } from "../../src/shared/lib/training/skillGuidance";
import type { Session, TrainingModuleId, TrainingModeId } from "../../src/shared/types/domain";

function makeSession(
  id: string,
  moduleId: TrainingModuleId,
  modeId: TrainingModeId,
  timestamp: string,
  overrides: Partial<Session> = {}
): Session {
  const modeByModule: Record<TrainingModuleId, Session["mode"]> = {
    schulte: "classic",
    sprint_math: "sprint_math",
    reaction: "reaction",
    n_back: "n_back",
    memory_grid: "memory_grid",
    spatial_memory: "spatial_memory",
    decision_rush: "decision_rush",
    memory_match: "memory_match",
    pattern_recognition: "pattern_recognition"
  };

  return {
    id,
    userId: "u1",
    taskId: moduleId,
    moduleId,
    modeId,
    mode: modeByModule[moduleId],
    level: 1,
    presetId: "easy",
    adaptiveSource: "auto",
    timestamp,
    localDate: timestamp.slice(0, 10),
    durationMs: 45_000,
    score: 60,
    accuracy: 0.8,
    speed: 1,
    errors: 1,
    difficulty: {
      gridSize: 3,
      numbersCount: 9,
      mode: modeByModule[moduleId]
    },
    ...overrides
  };
}

describe("buildSkillGuidance", () => {
  it("returns a starter path without training history", () => {
    const guidance = buildSkillGuidance([], new Date("2026-03-09T12:00:00.000Z"));

    expect(guidance.hasData).toBe(false);
    expect(guidance.focusSkillId).toBe("memory");
    expect(guidance.primaryModuleId).toBe("memory_match");
    expect(guidance.headline).toBe("Соберите стартовый профиль");
  });

  it("recommends the weakest meaningful skill as the next focus", () => {
    const guidance = buildSkillGuidance(
      [
        makeSession("s1", "reaction", "reaction_signal", "2026-03-08T10:00:00.000Z", {
          score: 164,
          accuracy: 0.93,
          errors: 0
        }),
        makeSession("s2", "reaction", "reaction_pair", "2026-03-07T10:00:00.000Z", {
          score: 152,
          accuracy: 0.9,
          errors: 1
        })
      ],
      new Date("2026-03-09T12:00:00.000Z")
    );

    expect(guidance.hasData).toBe(true);
    expect(guidance.strongestSkillId).toBe("reaction");
    expect(guidance.focusSkillId).toBe("memory");
    expect(guidance.primaryModuleId).toBe("memory_match");
    expect(guidance.summary).toContain("Реакция");
  });
});
