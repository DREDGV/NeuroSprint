import { describe, expect, it } from "vitest";
import {
  buildDailyChallengeStreak,
  getChallengeLaunchPath,
  listUpcomingDailyChallengeModes,
  resolveDailyChallengeModeId
} from "../../src/entities/challenge/dailyChallengeRepository";

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
