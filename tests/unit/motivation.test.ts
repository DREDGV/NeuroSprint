import { describe, expect, it } from "vitest";
import {
  buildDailyMiniGoals,
  resolveNextStreakBadge,
  resolveStreakBadge
} from "../../src/shared/lib/motivation/motivation";

describe("motivation helpers", () => {
  it("resolves streak badge by thresholds", () => {
    expect(resolveStreakBadge(0).id).toBe("start");
    expect(resolveStreakBadge(3).id).toBe("steady_3");
    expect(resolveStreakBadge(8).id).toBe("steady_7");
    expect(resolveStreakBadge(35).id).toBe("steady_30");
  });

  it("resolves next streak badge", () => {
    expect(resolveNextStreakBadge(0)?.id).toBe("steady_3");
    expect(resolveNextStreakBadge(7)?.id).toBe("steady_14");
    expect(resolveNextStreakBadge(30)).toBeNull();
  });

  it("builds mini goals with progress and completion", () => {
    const goals = buildDailyMiniGoals({
      streakDays: 2,
      dailyGoalSessions: 3,
      dailySummary: {
        date: "2026-02-25",
        sessionsTotal: 1,
        classicCount: 1,
        timedCount: 0,
        reverseCount: 0,
        bestClassicDurationMs: 12_000,
        bestTimedScore: null,
        bestReverseDurationMs: null,
        avgAccuracy: 0.9
      }
    });

    expect(goals).toHaveLength(3);
    expect(goals[0]).toMatchObject({
      id: "daily_sessions",
      completed: false,
      progressLabel: "1 / 3"
    });
    expect(goals[1]).toMatchObject({
      id: "streak_keep",
      completed: true
    });
    expect(goals[2]).toMatchObject({
      id: "next_badge",
      progressLabel: "2 / 3"
    });
  });

  it("omits next-badge goal on max streak tier", () => {
    const goals = buildDailyMiniGoals({
      streakDays: 31,
      dailyGoalSessions: 2,
      dailySummary: {
        date: "2026-02-25",
        sessionsTotal: 2,
        classicCount: 1,
        timedCount: 1,
        reverseCount: 0,
        bestClassicDurationMs: 11_000,
        bestTimedScore: 20,
        bestReverseDurationMs: null,
        avgAccuracy: 0.92
      }
    });

    expect(goals.map((goal) => goal.id)).toEqual(["daily_sessions", "streak_keep"]);
    expect(goals[0].completed).toBe(true);
  });
});
