import { describe, expect, it } from "vitest";
import { buildSkillRoadmap } from "../../src/shared/lib/training/skillRoadmap";
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

describe("buildSkillRoadmap", () => {
  it("creates a starter roadmap without history", () => {
    const roadmap = buildSkillRoadmap([], new Date("2026-03-09T12:00:00.000Z"));

    expect(roadmap.hasData).toBe(false);
    expect(roadmap.headline).toBe("7-дневный старт профиля");
    expect(roadmap.guidance.primaryModuleId).toBe("memory_match");
    expect(roadmap.days).toHaveLength(7);
    expect(roadmap.days[0]).toMatchObject({
      day: 1,
      tone: "focus",
      moduleId: "memory_match"
    });
    expect(roadmap.days[6]).toMatchObject({
      day: 7,
      tone: "checkpoint",
      moduleId: "memory_match"
    });
  });

  it("builds a focused week around the weakest skill while preserving the strongest one", () => {
    const roadmap = buildSkillRoadmap(
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

    expect(roadmap.hasData).toBe(true);
    expect(roadmap.headline).toBe("7 дней на память");
    expect(roadmap.guidance.strongestSkillId).toBe("reaction");
    expect(roadmap.guidance.primaryModuleId).toBe("memory_match");
    expect(roadmap.weekGoal).toContain("Подтянуть память");
    expect(roadmap.days[0]).toMatchObject({
      day: 1,
      tone: "focus",
      moduleId: "memory_match"
    });
    expect(roadmap.days[3]).toMatchObject({
      day: 4,
      tone: "maintain",
      moduleId: "reaction"
    });
    expect(roadmap.days.filter((day) => day.moduleId === "memory_match")).toHaveLength(4);
  });
});
