import { describe, expect, it } from "vitest";
import {
  buildClassicDailyPoints,
  buildTimedDailyPoints
} from "../../src/entities/session/sessionRepository";
import type { Session } from "../../src/shared/types/domain";

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
});
