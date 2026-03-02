import { describe, expect, it } from "vitest";
import {
  calculatePercentileValue,
  buildDailyCompareBandPoints,
  buildDailyProgressSummary,
  buildClassicDailyPoints,
  buildDecisionRushDailyPoints,
  buildNBackDailyPoints,
  buildReactionDailyPoints,
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

  it("builds reaction daily points", () => {
    const sessions: Session[] = [
      {
        id: "r1",
        userId: "u1",
        taskId: "reaction",
        moduleId: "reaction",
        modeId: "reaction_signal",
        mode: "reaction",
        level: 1,
        presetId: "legacy",
        adaptiveSource: "legacy",
        timestamp: "2026-02-21T12:00:00.000Z",
        localDate: "2026-02-21",
        durationMs: 320,
        score: 110,
        accuracy: 1,
        speed: 187.5,
        errors: 0,
        correctCount: 5,
        effectiveCorrect: 5,
        difficulty: {
          gridSize: 3,
          numbersCount: 5,
          mode: "reaction"
        }
      },
      {
        id: "r2",
        userId: "u1",
        taskId: "reaction",
        moduleId: "reaction",
        modeId: "reaction_signal",
        mode: "reaction",
        level: 1,
        presetId: "legacy",
        adaptiveSource: "legacy",
        timestamp: "2026-02-21T13:00:00.000Z",
        localDate: "2026-02-21",
        durationMs: 400,
        score: 95,
        accuracy: 0.8,
        speed: 150,
        errors: 1,
        correctCount: 4,
        effectiveCorrect: 3.5,
        difficulty: {
          gridSize: 3,
          numbersCount: 5,
          mode: "reaction"
        }
      }
    ];

    const points = buildReactionDailyPoints(sessions);
    expect(points).toHaveLength(1);
    expect(points[0].bestReactionMs).toBe(320);
    expect(points[0].avgReactionMs).toBe(360);
    expect(points[0].accuracy).toBeCloseTo(0.9, 6);
    expect(points[0].avgScore).toBeCloseTo(102.5, 6);
  });

  it("builds nback daily points", () => {
    const sessions: Session[] = [
      {
        id: "n1",
        userId: "u1",
        taskId: "n_back",
        moduleId: "n_back",
        modeId: "nback_1",
        mode: "n_back",
        level: 1,
        presetId: "legacy",
        adaptiveSource: "manual",
        timestamp: "2026-02-21T12:00:00.000Z",
        localDate: "2026-02-21",
        durationMs: 60_000,
        score: 34,
        accuracy: 0.8,
        speed: 24,
        errors: 4,
        correctCount: 32,
        effectiveCorrect: 30,
        difficulty: {
          gridSize: 3,
          numbersCount: 40,
          mode: "n_back"
        }
      },
      {
        id: "n2",
        userId: "u1",
        taskId: "n_back",
        moduleId: "n_back",
        modeId: "nback_2",
        mode: "n_back",
        level: 2,
        presetId: "legacy",
        adaptiveSource: "manual",
        timestamp: "2026-02-21T13:00:00.000Z",
        localDate: "2026-02-21",
        durationMs: 60_000,
        score: 38,
        accuracy: 0.85,
        speed: 26,
        errors: 3,
        correctCount: 34,
        effectiveCorrect: 32.5,
        difficulty: {
          gridSize: 3,
          numbersCount: 40,
          mode: "n_back"
        }
      }
    ];

    const points = buildNBackDailyPoints(sessions);
    expect(points).toHaveLength(1);
    expect(points[0].accuracy).toBeCloseTo(0.825, 6);
    expect(points[0].avgScore).toBeCloseTo(36, 6);
    expect(points[0].speed).toBeCloseTo(25, 6);
    expect(points[0].count).toBe(2);
  });

  it("builds decision rush daily points", () => {
    const sessions: Session[] = [
      {
        id: "d1",
        userId: "u1",
        taskId: "decision_rush",
        moduleId: "decision_rush",
        modeId: "decision_standard",
        mode: "decision_rush",
        level: 5,
        presetId: "legacy",
        adaptiveSource: "manual",
        timestamp: "2026-02-21T12:00:00.000Z",
        localDate: "2026-02-21",
        durationMs: 60_000,
        score: 120,
        accuracy: 0.84,
        speed: 40,
        errors: 5,
        correctCount: 21,
        reactionAvgMs: 680,
        reactionP90Ms: 920,
        trialsTotal: 25,
        bestCombo: 7,
        points: 250,
        difficulty: {
          gridSize: 3,
          numbersCount: 25,
          mode: "decision_rush"
        }
      },
      {
        id: "d2",
        userId: "u1",
        taskId: "decision_rush",
        moduleId: "decision_rush",
        modeId: "decision_pro",
        mode: "decision_rush",
        level: 8,
        presetId: "legacy",
        adaptiveSource: "manual",
        timestamp: "2026-02-21T13:00:00.000Z",
        localDate: "2026-02-21",
        durationMs: 60_000,
        score: 135,
        accuracy: 0.88,
        speed: 42,
        errors: 4,
        correctCount: 22,
        reactionAvgMs: 640,
        reactionP90Ms: 860,
        trialsTotal: 25,
        bestCombo: 9,
        points: 290,
        difficulty: {
          gridSize: 3,
          numbersCount: 25,
          mode: "decision_rush"
        }
      }
    ];

    const points = buildDecisionRushDailyPoints(sessions);
    expect(points).toHaveLength(1);
    expect(points[0].accuracy).toBeCloseTo(0.86, 6);
    expect(points[0].avgScore).toBeCloseTo(127.5, 6);
    expect(points[0].reactionP90Ms).toBeCloseTo(890, 6);
    expect(points[0].bestComboAvg).toBeCloseTo(8, 6);
    expect(points[0].count).toBe(2);
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

  it("builds compare band points by day for score metric", () => {
    const sessions: Session[] = [
      {
        id: "s1",
        userId: "u1",
        taskId: "schulte",
        ...baseSessionMeta,
        modeId: "classic_plus",
        mode: "classic",
        timestamp: "2026-02-24T10:00:00.000Z",
        localDate: "2026-02-24",
        durationMs: 30_000,
        score: 10,
        accuracy: 0.95,
        speed: 50,
        errors: 1,
        difficulty: baseDifficulty
      },
      {
        id: "s2",
        userId: "u2",
        taskId: "schulte",
        ...baseSessionMeta,
        modeId: "classic_plus",
        mode: "classic",
        timestamp: "2026-02-24T10:00:00.000Z",
        localDate: "2026-02-24",
        durationMs: 30_000,
        score: 20,
        accuracy: 0.95,
        speed: 50,
        errors: 1,
        difficulty: baseDifficulty
      },
      {
        id: "s3",
        userId: "u3",
        taskId: "schulte",
        ...baseSessionMeta,
        modeId: "classic_plus",
        mode: "classic",
        timestamp: "2026-02-24T10:00:00.000Z",
        localDate: "2026-02-24",
        durationMs: 30_000,
        score: 30,
        accuracy: 0.95,
        speed: 50,
        errors: 1,
        difficulty: baseDifficulty
      },
      {
        id: "s4",
        userId: "u4",
        taskId: "schulte",
        ...baseSessionMeta,
        modeId: "classic_plus",
        mode: "classic",
        timestamp: "2026-02-24T10:00:00.000Z",
        localDate: "2026-02-24",
        durationMs: 30_000,
        score: 40,
        accuracy: 0.95,
        speed: 50,
        errors: 1,
        difficulty: baseDifficulty
      }
    ];

    const points = buildDailyCompareBandPoints(sessions, "score");
    expect(points).toHaveLength(1);
    expect(points[0].p25).toBeCloseTo(17.5, 6);
    expect(points[0].median).toBeCloseTo(25, 6);
    expect(points[0].p75).toBeCloseTo(32.5, 6);
    expect(points[0].usersCount).toBe(4);
    expect(points[0].sessionsCount).toBe(4);
  });

  it("calculates percentile value with interpolation", () => {
    const values = [10, 20, 30, 40];
    expect(calculatePercentileValue(values, 0.25)).toBeCloseTo(17.5, 6);
    expect(calculatePercentileValue(values, 0.5)).toBeCloseTo(25, 6);
    expect(calculatePercentileValue(values, 0.75)).toBeCloseTo(32.5, 6);
  });
});
