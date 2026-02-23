import { describe, expect, it } from "vitest";
import { computeAdaptiveDecision } from "../../src/shared/lib/training/adaptive";
import type { Session } from "../../src/shared/types/domain";

function makeSession(id: string, score: number, accuracy: number): Session {
  return {
    id,
    userId: "u1",
    taskId: "schulte",
    moduleId: "schulte",
    modeId: "classic_plus",
    level: 3,
    presetId: "standard",
    adaptiveSource: "auto",
    mode: "classic",
    timestamp: `2026-02-2${id}T10:00:00.000Z`,
    localDate: `2026-02-2${id}`,
    durationMs: 30_000,
    score,
    accuracy,
    speed: 50,
    errors: 1,
    difficulty: {
      gridSize: 5,
      numbersCount: 25,
      mode: "classic"
    }
  };
}

describe("adaptive decision", () => {
  it("increases level when accuracy and score growth are high", () => {
    const sessions = [
      makeSession("1", 100, 0.92),
      makeSession("2", 110, 0.93),
      makeSession("3", 120, 0.95)
    ];
    const decision = computeAdaptiveDecision(sessions, 4);
    expect(decision.delta).toBe(1);
    expect(decision.nextLevel).toBe(5);
  });

  it("decreases level when accuracy is below threshold", () => {
    const sessions = [
      makeSession("1", 100, 0.7),
      makeSession("2", 98, 0.72),
      makeSession("3", 95, 0.73)
    ];
    const decision = computeAdaptiveDecision(sessions, 4);
    expect(decision.delta).toBe(-1);
    expect(decision.nextLevel).toBe(3);
  });

  it("keeps level when conditions are neutral", () => {
    const sessions = [
      makeSession("1", 100, 0.82),
      makeSession("2", 101, 0.83),
      makeSession("3", 102, 0.81)
    ];
    const decision = computeAdaptiveDecision(sessions, 4);
    expect(decision.delta).toBe(0);
    expect(decision.nextLevel).toBe(4);
  });
});

