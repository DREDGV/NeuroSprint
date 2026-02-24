import { describe, expect, it } from "vitest";
import {
  buildLevelDistribution,
  calculatePercentile,
  computeMembershipMutation
} from "../../src/entities/group/groupRepository";

describe("group percentile", () => {
  it("returns null for empty set", () => {
    expect(calculatePercentile([], 10)).toBeNull();
  });

  it("calculates percentile by less-or-equal rule", () => {
    const percentile = calculatePercentile([10, 20, 30, 40], 30);
    expect(percentile).toBeCloseTo(75, 6);
  });

  it("builds sorted level distribution with clamped levels", () => {
    const distribution = buildLevelDistribution([
      { level: 1 },
      { level: 2 },
      { level: 2 },
      { level: 9.7 },
      { level: 15 },
      { level: 0 }
    ]);

    expect(distribution).toEqual([
      { level: 1, count: 2 },
      { level: 2, count: 2 },
      { level: 10, count: 2 }
    ]);
  });

  it("keeps only one active class membership per user", () => {
    const mutation = computeMembershipMutation(
      [
        { id: "m1", groupId: "g1", userId: "u1", joinedAt: "2026-02-24" },
        { id: "m2", groupId: "g2", userId: "u1", joinedAt: "2026-02-24" }
      ],
      "g2"
    );

    expect(mutation.alreadyInTarget?.id).toBe("m2");
    expect(mutation.toRemoveIds).toEqual(["m1"]);
  });
});
