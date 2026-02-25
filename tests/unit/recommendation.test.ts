import { describe, expect, it } from "vitest";
import { recommendModeByPerformance } from "../../src/shared/lib/training/recommendation";
import type { Session, TrainingModeId } from "../../src/shared/types/domain";

function createSession(
  id: string,
  modeId: TrainingModeId,
  score: number,
  accuracy: number,
  speed: number,
  timestamp: string
): Session {
  const mode =
    modeId === "timed_plus"
      ? "timed"
      : modeId === "sprint_add_sub" || modeId === "sprint_mixed"
        ? "sprint_math"
        : "classic";

  return {
    id,
    userId: "u1",
    taskId: mode === "sprint_math" ? "sprint_math" : "schulte",
    moduleId: mode === "sprint_math" ? "sprint_math" : "schulte",
    modeId,
    mode,
    level: 3,
    presetId: "standard",
    adaptiveSource: "auto",
    timestamp,
    localDate: timestamp.slice(0, 10),
    durationMs: 60_000,
    score,
    accuracy,
    speed,
    errors: 1,
    correctCount: mode === "sprint_math" ? 20 : undefined,
    effectiveCorrect: mode === "timed" ? 18 : undefined,
    difficulty: {
      gridSize: 5,
      numbersCount: 25,
      mode,
      timeLimitSec: mode === "timed" ? 60 : undefined,
      errorPenalty: mode === "timed" ? 0.5 : undefined
    }
  };
}

describe("recommendModeByPerformance", () => {
  it("returns classic_plus for empty history", () => {
    const recommendation = recommendModeByPerformance([]);
    expect(recommendation.modeId).toBe("classic_plus");
    expect(recommendation.confidence).toBeGreaterThan(0.5);
  });

  it("recommends untrained mode first", () => {
    const sessions: Session[] = [
      createSession("a1", "classic_plus", 40, 0.94, 24, "2026-02-25T10:00:00.000Z"),
      createSession("a2", "timed_plus", 32, 0.91, 22, "2026-02-25T11:00:00.000Z"),
      createSession("a3", "sprint_add_sub", 30, 0.93, 26, "2026-02-25T12:00:00.000Z"),
      createSession("a4", "sprint_mixed", 28, 0.9, 20, "2026-02-25T13:00:00.000Z")
    ];

    const recommendation = recommendModeByPerformance(sessions);
    expect(recommendation.modeId).toBe("reverse");
    expect(recommendation.reason).toContain("ещё не тренировался");
  });

  it("uses sprint throughput and score trend for recommendation", () => {
    const sessions: Session[] = [
      createSession("c1", "classic_plus", 48, 0.95, 28, "2026-02-21T10:00:00.000Z"),
      createSession("c2", "classic_plus", 50, 0.96, 29, "2026-02-23T10:00:00.000Z"),
      createSession("t1", "timed_plus", 36, 0.9, 24, "2026-02-21T11:00:00.000Z"),
      createSession("t2", "timed_plus", 38, 0.91, 25, "2026-02-23T11:00:00.000Z"),
      createSession("r1", "reverse", 45, 0.92, 27, "2026-02-22T12:00:00.000Z"),
      createSession("r2", "reverse", 46, 0.93, 27, "2026-02-24T12:00:00.000Z"),
      createSession("s1", "sprint_add_sub", 32, 0.91, 23, "2026-02-21T13:00:00.000Z"),
      createSession("s2", "sprint_add_sub", 33, 0.92, 24, "2026-02-24T13:00:00.000Z"),
      createSession("m1", "sprint_mixed", 24, 0.82, 12, "2026-02-21T14:00:00.000Z"),
      createSession("m2", "sprint_mixed", 20, 0.8, 11, "2026-02-24T14:00:00.000Z")
    ];

    const recommendation = recommendModeByPerformance(sessions);
    expect(recommendation.modeId).toBe("sprint_mixed");
    expect(recommendation.reason).toContain("темп");
    expect(recommendation.confidence).toBeGreaterThanOrEqual(0.55);
    expect(recommendation.confidence).toBeLessThanOrEqual(0.9);
  });
});
