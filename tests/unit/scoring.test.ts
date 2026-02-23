import { describe, expect, it } from "vitest";
import {
  calcClassicMetrics,
  calcTimedMetrics,
  clampAccuracy
} from "../../src/shared/lib/scoring/scoring";

describe("scoring", () => {
  it("clamps accuracy between 0 and 1", () => {
    expect(clampAccuracy(-1)).toBe(0);
    expect(clampAccuracy(0.4)).toBe(0.4);
    expect(clampAccuracy(2)).toBe(1);
  });

  it("calculates classic metrics", () => {
    const metrics = calcClassicMetrics({
      durationMs: 60_000,
      errors: 2
    });

    expect(metrics.speed).toBeCloseTo(25, 6);
    expect(metrics.accuracy).toBeCloseTo(0.92, 6);
    expect(metrics.score).toBeCloseTo(24.4, 1);
  });

  it("calculates timed metrics", () => {
    const metrics = calcTimedMetrics({
      correctCount: 40,
      errors: 4,
      timeLimitSec: 60,
      errorPenalty: 0.5
    });

    expect(metrics.effectiveCorrect).toBeCloseTo(38, 6);
    expect(metrics.speed).toBeCloseTo(38, 6);
    expect(metrics.accuracy).toBeCloseTo(40 / 44, 6);
    expect(metrics.score).toBeGreaterThan(0);
  });
});

