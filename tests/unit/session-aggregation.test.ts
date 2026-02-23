import { describe, expect, it } from "vitest";
import {
  buildDailyProgressSummary,
  buildClassicDailyPoints,
  buildTimedDailyPoints
} from "../../src/entities/session/sessionRepository";
import type { Session } from "../../src/shared/types/domain";

const baseSessionMeta = {
  moduleId: "schulte" as const,
  level: 3,
  presetId: "standard" as const,
  adaptiveSource: "auto" as const
};

const baseDifficulty = {
  gridSize: 5 as const,
  numbersCount: 25 as const,
  mode: "classic" as const
};

describe("session aggregation", () => {
  it("builds classic daily points", () => {
    const sessions: Session[] = [
      {
        id: "a",
        userId: "u1",
        taskId: "schulte",
        ...baseSessionMeta,
        modeId: "classic_plus",
        mode: "classic",
        timestamp: "2026-02-20T12:00:00.000Z",
        localDate: "2026-02-20",
        durationMs: 31_000,
        score: 48,
        accuracy: 0.96,
        speed: 48,
        errors: 1,
        difficulty: baseDifficulty
      },
      {
        id: "b",
        userId: "u1",
        taskId: "schulte",
        ...baseSessionMeta,
        modeId: "classic_plus",
        mode: "classic",
        timestamp: "2026-02-20T13:00:00.000Z",
        localDate: "2026-02-20",
        durationMs: 35_000,
        score: 44,
        accuracy: 0.9,
        speed: 44,
        errors: 2,
        difficulty: baseDifficulty
      }
    ];

    const points = buildClassicDailyPoints(sessions);
    expect(points).toHaveLength(1);
    expect(points[0].bestDurationMs).toBe(31_000);
    expect(points[0].avgDurationMs).toBe(33_000);
  });

  it("builds timed daily points", () => {
    const sessions: Session[] = [
      {
        id: "t1",
        userId: "u1",
        taskId: "schulte",
        ...baseSessionMeta,
        modeId: "timed_plus",
        mode: "timed",
        timestamp: "2026-02-21T12:00:00.000Z",
        localDate: "2026-02-21",
        durationMs: 60_000,
        score: 30,
        accuracy: 0.8,
        speed: 34,
        errors: 4,
        correctCount: 36,
        effectiveCorrect: 34,
        difficulty: {
          gridSize: 5,
          numbersCount: 25,
          mode: "timed",
          timeLimitSec: 60,
          errorPenalty: 0.5
        }
      },
      {
        id: "t2",
        userId: "u1",
        taskId: "schulte",
        ...baseSessionMeta,
        modeId: "timed_plus",
        mode: "timed",
        timestamp: "2026-02-21T14:00:00.000Z",
        localDate: "2026-02-21",
        durationMs: 60_000,
        score: 35,
        accuracy: 0.84,
        speed: 38,
        errors: 4,
        correctCount: 40,
        effectiveCorrect: 38,
        difficulty: {
          gridSize: 5,
          numbersCount: 25,
          mode: "timed",
          timeLimitSec: 60,
          errorPenalty: 0.5
        }
      }
    ];

    const points = buildTimedDailyPoints(sessions);
    expect(points).toHaveLength(1);
    expect(points[0].effectivePerMinute).toBeCloseTo(36, 6);
    expect(points[0].avgScore).toBeCloseTo(32.5, 6);
  });

  it("builds daily progress summary", () => {
    const sessions: Session[] = [
      {
        id: "c1",
        userId: "u1",
        taskId: "schulte",
        ...baseSessionMeta,
        modeId: "classic_plus",
        mode: "classic",
        timestamp: "2026-02-23T10:00:00.000Z",
        localDate: "2026-02-23",
        durationMs: 31_000,
        score: 48,
        accuracy: 0.96,
        speed: 48,
        errors: 1,
        difficulty: baseDifficulty
      },
      {
        id: "t1",
        userId: "u1",
        taskId: "schulte",
        ...baseSessionMeta,
        modeId: "timed_plus",
        mode: "timed",
        timestamp: "2026-02-23T11:00:00.000Z",
        localDate: "2026-02-23",
        durationMs: 60_000,
        score: 35,
        accuracy: 0.84,
        speed: 38,
        errors: 3,
        correctCount: 40,
        effectiveCorrect: 38.5,
        difficulty: {
          gridSize: 5,
          numbersCount: 25,
          mode: "timed",
          timeLimitSec: 60,
          errorPenalty: 0.5
        }
      },
      {
        id: "old",
        userId: "u1",
        taskId: "schulte",
        ...baseSessionMeta,
        modeId: "classic_plus",
        mode: "classic",
        timestamp: "2026-02-22T10:00:00.000Z",
        localDate: "2026-02-22",
        durationMs: 45_000,
        score: 30,
        accuracy: 0.8,
        speed: 30,
        errors: 5,
        difficulty: baseDifficulty
      }
    ];

    const summary = buildDailyProgressSummary(sessions, "2026-02-23");
    expect(summary.sessionsTotal).toBe(2);
    expect(summary.classicCount).toBe(1);
    expect(summary.timedCount).toBe(1);
    expect(summary.reverseCount).toBe(0);
    expect(summary.bestClassicDurationMs).toBe(31_000);
    expect(summary.bestTimedScore).toBe(35);
    expect(summary.bestReverseDurationMs).toBeNull();
    expect(summary.avgAccuracy).toBeCloseTo(0.9, 6);
  });
});
