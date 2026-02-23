import { describe, expect, it } from "vitest";
import { calculatePercentile } from "../../src/entities/group/groupRepository";

describe("group percentile", () => {
  it("returns null for empty set", () => {
    expect(calculatePercentile([], 10)).toBeNull();
  });

  it("calculates percentile by less-or-equal rule", () => {
    const percentile = calculatePercentile([10, 20, 30, 40], 30);
    expect(percentile).toBeCloseTo(75, 6);
  });
});

