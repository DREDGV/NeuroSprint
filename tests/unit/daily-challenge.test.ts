import { describe, expect, it } from "vitest";
import {
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
});
