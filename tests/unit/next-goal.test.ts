import { describe, expect, it } from "vitest";
import { buildProgressGoalSummary, formatProgressGoalLine } from "../../src/shared/lib/progress/nextGoal";
import type { Session, UserAchievement, UserLevel } from "../../src/shared/types/domain";

function makeLevel(overrides: Partial<UserLevel> = {}): UserLevel {
  return {
    id: "u1",
    userId: "u1",
    level: 4,
    currentXP: 80,
    totalXP: 380,
    xpToNextLevel: 200,
    lastLevelUpAt: null,
    updatedAt: "2026-03-10T10:00:00.000Z",
    ...overrides
  };
}

function makeAchievement(overrides: Partial<UserAchievement>): UserAchievement {
  return {
    id: "ua-1",
    userId: "u1",
    achievementId: "skill_memory_match_10",
    progress: 60,
    completed: false,
    completedAt: null,
    createdAt: "2026-03-10T10:00:00.000Z",
    updatedAt: "2026-03-10T10:00:00.000Z",
    ...overrides
  };
}

function makeSession(id: string): Session {
  return {
    id,
    userId: "u1",
    taskId: "memory_match",
    moduleId: "memory_match",
    modeId: "memory_match_classic",
    mode: "memory_match",
    level: 1,
    presetId: "easy",
    adaptiveSource: "auto",
    timestamp: `2026-03-${id.padStart(2, "0")}T10:00:00.000Z`,
    localDate: `2026-03-${id.padStart(2, "0")}`,
    durationMs: 45_000,
    score: 100,
    accuracy: 0.9,
    speed: 1,
    errors: 0,
    difficulty: {
      gridSize: 4,
      numbersCount: 8,
      mode: "memory_match"
    }
  } as Session;
}

describe("buildProgressGoalSummary", () => {
  it("prefers the most advanced achievement and keeps level as parallel goal", () => {
    const sessions = Array.from({ length: 6 }, (_, index) => makeSession(String(index + 1)));
    const summary = buildProgressGoalSummary({
      level: makeLevel(),
      achievements: [makeAchievement({ progress: 60 })],
      sessions
    });

    expect(summary.primaryGoal.kind).toBe("achievement");
    expect(summary.primaryGoal.title).toBe("Карта памяти");
    expect(summary.primaryGoal.summary).toBe('До "Карта памяти" осталось 4 сессии');
    expect(summary.secondaryGoal?.summary).toBe("До уровня 5 осталось 120 XP");
    expect(formatProgressGoalLine(summary)).toBe(
      'Следующая цель: До "Карта памяти" осталось 4 сессии. Параллельно: До уровня 5 осталось 120 XP.'
    );
  });

  it("keeps level as the primary target when it is clearly closer", () => {
    const summary = buildProgressGoalSummary({
      level: makeLevel({ currentXP: 170 }),
      achievements: [makeAchievement({ progress: 20 })]
    });

    expect(summary.primaryGoal.kind).toBe("level");
    expect(summary.primaryGoal.summary).toBe("До уровня 5 осталось 30 XP");
    expect(summary.secondaryGoal?.kind).toBe("achievement");
  });
});
