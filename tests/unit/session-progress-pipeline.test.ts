import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/db/database";
import { levelRepository } from "../../src/entities/level/levelRepository";
import { sessionRepository } from "../../src/entities/session/sessionRepository";
import { saveSettings } from "../../src/shared/lib/settings/settings";
import type { Session } from "../../src/shared/types/domain";

const testUserId = "progress-user";
const today = "2026-03-09";

function buildLegacySession(id: string, localDate: string): Session {
  return {
    id,
    userId: testUserId,
    taskId: "memory_match",
    mode: "memory_match",
    moduleId: "memory_match",
    modeId: "memory_match_classic",
    level: 1,
    presetId: "legacy",
    adaptiveSource: "legacy",
    timestamp: `${localDate}T10:00:00.000Z`,
    localDate,
    durationMs: 45_000,
    score: 120,
    accuracy: 0.9,
    speed: 3.2,
    errors: 1,
    difficulty: {
      mode: "memory_match",
      pairs: 8,
      gridSize: 4,
      numbersCount: 16
    }
  } as unknown as Session;
}

function buildLegacySpatialSession(id: string, localDate: string): Session {
  return {
    id,
    userId: testUserId,
    taskId: "spatial_memory",
    mode: "spatial_memory",
    moduleId: "spatial_memory",
    modeId: "spatial_memory_classic",
    level: 2,
    presetId: "easy",
    adaptiveSource: "auto",
    timestamp: `${localDate}T10:00:00.000Z`,
    localDate,
    durationMs: 18_000,
    score: 128,
    accuracy: 0.86,
    speed: 12,
    errors: 1,
    correctCount: 4,
    trialsTotal: 5,
    difficulty: {
      mode: "spatial_memory",
      gridSize: 4,
      numbersCount: 16
    }
  } as Session;
}

describe("sessionRepository.save progress pipeline", () => {
  beforeEach(async () => {
    localStorage.clear();
    saveSettings({
      timedDefaultLimitSec: 60,
      timedErrorPenalty: 0.5,
      dailyGoalSessions: 1
    });

    await db.sessions.where("userId").equals(testUserId).delete();
    await db.dailyTrainingSessions.where("userId").equals(testUserId).delete();
    await db.dailyTrainings.where("userId").equals(testUserId).delete();
    await db.userAchievements.where("userId").equals(testUserId).delete();
    await db.xpLogs.where("userId").equals(testUserId).delete();
    await db.userLevels.delete(testUserId);
    await db.users.delete(testUserId);

    await db.users.put({
      id: testUserId,
      name: "Прогресс",
      role: "home",
      createdAt: "2026-03-01T09:00:00.000Z",
      lastActivity: "2026-03-01T09:00:00.000Z",
      totalSessions: 0,
      totalTimeSec: 0,
      sessionsByModule: {
        schulte: 0,
        sprint_math: 0,
        reaction: 0,
        n_back: 0,
        memory_grid: 0,
        spatial_memory: 0,
        decision_rush: 0,
        memory_match: 0,
        pattern_recognition: 0
      }
    });

    const seededSessions = Array.from({ length: 9 }, (_, index) =>
      buildLegacySession(`seed-${index + 1}`, `2026-02-${String(index + 1).padStart(2, "0")}`)
    );
    await db.sessions.bulkAdd(seededSessions);
  });

  afterEach(async () => {
    await db.sessions.where("userId").equals(testUserId).delete();
    await db.dailyTrainingSessions.where("userId").equals(testUserId).delete();
    await db.dailyTrainings.where("userId").equals(testUserId).delete();
    await db.userAchievements.where("userId").equals(testUserId).delete();
    await db.xpLogs.where("userId").equals(testUserId).delete();
    await db.userLevels.delete(testUserId);
    await db.users.delete(testUserId);
    localStorage.clear();
  });

  it("awards session xp, daily bonus and achievement xp in one save flow", async () => {
    const result = await sessionRepository.save(buildLegacySession("session-10", today));

    expect(result.dailyTrainingCompleted).toBe(true);
    expect(result.xpBreakdown).toMatchObject({
      session: 10,
      dailyComplete: 25,
      streakBonus: 0,
      achievement: 48,
      total: 83
    });
    expect(result.newlyUnlockedAchievements).toEqual(
      expect.arrayContaining(["sessions_10", "skill_memory_match_10"])
    );
    expect(result.nextGoal?.primaryGoal.summary).toBe("До уровня 2 осталось 17 XP");

    const level = await levelRepository.getUserLevel(testUserId);
    expect(level?.totalXP).toBe(83);
    expect(level?.level).toBe(1);

    const achievements = await db.userAchievements.where("userId").equals(testUserId).toArray();
    expect(
      achievements.find((achievement) => achievement.achievementId === "sessions_10")?.completed
    ).toBe(true);
    expect(
      achievements.find((achievement) => achievement.achievementId === "skill_memory_match_10")
        ?.completed
    ).toBe(true);
  });

  it("unlocks the Spatial Memory module achievement on the 10th session", async () => {
    await db.sessions.where("userId").equals(testUserId).delete();

    const seededSessions = Array.from({ length: 9 }, (_, index) =>
      buildLegacySpatialSession(`spatial-seed-${index + 1}`, `2026-02-${String(index + 1).padStart(2, "0")}`)
    );
    await db.sessions.bulkAdd(seededSessions);

    const result = await sessionRepository.save(buildLegacySpatialSession("spatial-session-10", today));

    expect(result.newlyUnlockedAchievements).toEqual(
      expect.arrayContaining(["sessions_10", "skill_spatial_memory_10"])
    );

    const achievements = await db.userAchievements.where("userId").equals(testUserId).toArray();
    expect(
      achievements.find((achievement) => achievement.achievementId === "skill_spatial_memory_10")
        ?.completed
    ).toBe(true);
  });
});
