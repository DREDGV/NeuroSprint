import { describe, expect, it } from "vitest";
import {
  buildDailyChallengeStreak,
  getChallengeLaunchPath,
  listUpcomingDailyChallengeModes,
  resolveAdaptiveDailyChallengeModeId,
  resolveDailyChallengeModeId
} from "../../src/entities/challenge/dailyChallengeRepository";
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

describe("daily challenge helpers", () => {
  it("resolves deterministic daily mode by date", () => {
    const first = resolveDailyChallengeModeId("2026-03-01");
    const second = resolveDailyChallengeModeId("2026-03-01");
    const nextDay = resolveDailyChallengeModeId("2026-03-02");

    expect(first).toBe(second);
    expect(nextDay).not.toBe(first);
  });

  it("maps challenge mode to setup launch route", () => {
    expect(getChallengeLaunchPath("classic_plus")).toBe("/training/schulte?mode=classic_plus");
    expect(getChallengeLaunchPath("sprint_add_sub")).toBe(
      "/training/sprint-math?mode=sprint_add_sub"
    );
    expect(getChallengeLaunchPath("reaction_pair")).toBe("/training/reaction?mode=reaction_pair");
    expect(getChallengeLaunchPath("nback_2")).toBe("/training/nback?mode=nback_2");
    expect(getChallengeLaunchPath("memory_grid_rush")).toBe(
      "/training/memory-grid?mode=memory_grid_rush"
    );
    expect(getChallengeLaunchPath("pattern_classic")).toBe(
      "/training/pattern-recognition?mode=pattern_classic"
    );
  });

  it("builds upcoming challenge preview based on deterministic rotation", () => {
    const preview = listUpcomingDailyChallengeModes("2026-03-01", 3);
    expect(preview).toHaveLength(3);
    expect(preview[0]?.localDate).toBe("2026-03-01");
    expect(preview[1]?.localDate).toBe("2026-03-02");
    expect(preview[2]?.localDate).toBe("2026-03-03");
    expect(preview[0]?.modeId).toBe(resolveDailyChallengeModeId("2026-03-01"));
    expect(preview[1]?.modeId).toBe(resolveDailyChallengeModeId("2026-03-02"));
  });

  it("switches today's challenge to the growth focus when there is enough history", () => {
    const modeId = resolveAdaptiveDailyChallengeModeId("2026-03-09", [
      makeSession("s1", "reaction", "reaction_signal", "2026-03-08T10:00:00.000Z", {
        score: 164,
        accuracy: 0.93,
        errors: 0
      }),
      makeSession("s2", "reaction", "reaction_pair", "2026-03-07T10:00:00.000Z", {
        score: 152,
        accuracy: 0.9,
        errors: 1
      }),
      makeSession("s3", "reaction", "reaction_number", "2026-03-06T10:00:00.000Z", {
        score: 149,
        accuracy: 0.89,
        errors: 1
      })
    ]);

    expect(modeId).toBe("memory_match_classic");
  });

  it("can align the first preview item with an already created adaptive challenge", () => {
    const preview = listUpcomingDailyChallengeModes("2026-03-01", 3, "memory_match_classic");

    expect(preview[0]?.modeId).toBe("memory_match_classic");
    expect(preview[1]?.modeId).toBe(resolveDailyChallengeModeId("2026-03-02"));
    expect(preview[2]?.modeId).toBe(resolveDailyChallengeModeId("2026-03-03"));
  });

  it("computes current and best challenge streak", () => {
    const streak = buildDailyChallengeStreak([
      { localDate: "2026-03-10", status: "completed" },
      { localDate: "2026-03-09", status: "completed" },
      { localDate: "2026-03-08", status: "pending" },
      { localDate: "2026-03-07", status: "completed" },
      { localDate: "2026-03-06", status: "completed" },
      { localDate: "2026-03-05", status: "completed" }
    ]);

    expect(streak.currentStreakDays).toBe(2);
    expect(streak.bestStreakDays).toBe(3);
    expect(streak.completedDays).toBe(5);
  });
});
