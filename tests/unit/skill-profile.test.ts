import { describe, expect, it } from "vitest";
import { buildSkillProfile } from "../../src/shared/lib/training/skillProfile";
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

describe("buildSkillProfile", () => {
  it("returns a calm baseline profile without sessions", () => {
    const profile = buildSkillProfile([], new Date("2026-03-09T12:00:00.000Z"));

    expect(profile.totalSessions).toBe(0);
    expect(profile.hasData).toBe(false);
    expect(profile.axes).toHaveLength(5);
    expect(profile.axes.every((axis) => axis.score === 18)).toBe(true);
    expect(profile.axes.every((axis) => axis.level === 1)).toBe(true);
    expect(profile.axes.map((axis) => axis.label)).toEqual([
      "Внимание",
      "Память",
      "Реакция",
      "Счёт",
      "Логика"
    ]);
  });

  it("surfaces strongest and weakest skills from recent sessions", () => {
    const sessions: Session[] = [
      makeSession("s1", "sprint_math", "sprint_add_sub", "2026-03-08T10:00:00.000Z", {
        score: 112,
        accuracy: 0.96,
        errors: 0
      }),
      makeSession("s2", "sprint_math", "sprint_add_sub", "2026-03-07T10:00:00.000Z", {
        score: 108,
        accuracy: 0.94,
        errors: 0
      }),
      makeSession("s3", "sprint_math", "sprint_mixed", "2026-03-06T10:00:00.000Z", {
        score: 104,
        accuracy: 0.92,
        errors: 0
      }),
      makeSession("s4", "sprint_math", "sprint_mixed", "2026-03-05T10:00:00.000Z", {
        score: 100,
        accuracy: 0.91,
        errors: 0
      }),
      makeSession("s5", "reaction", "reaction_signal", "2026-03-01T10:00:00.000Z", {
        score: 150,
        accuracy: 0.86,
        errors: 1
      }),
      makeSession("s6", "reaction", "reaction_pair", "2026-02-28T10:00:00.000Z", {
        score: 142,
        accuracy: 0.84,
        errors: 1
      }),
      makeSession("s7", "pattern_recognition", "pattern_classic", "2026-03-08T10:00:00.000Z", {
        score: 18,
        accuracy: 0.34,
        errors: 6
      }),
      makeSession("s8", "pattern_recognition", "pattern_learning", "2026-03-06T10:00:00.000Z", {
        score: 22,
        accuracy: 0.4,
        errors: 5
      })
    ];

    const profile = buildSkillProfile(sessions, new Date("2026-03-09T12:00:00.000Z"));

    expect(profile.totalSessions).toBe(8);
    expect(profile.hasData).toBe(true);
    expect(profile.strongest.id).toBe("math");
    expect(profile.strongest.score).toBeGreaterThan(50);
    expect(profile.focus.id).toBe("memory");
    expect(profile.axes.find((axis) => axis.id === "reaction")?.score).toBeGreaterThan(18);
  });
});
