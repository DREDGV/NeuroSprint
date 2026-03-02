import { describe, expect, it } from "vitest";
import {
  calculateNBackSteps,
  evaluateNBackSession,
  generateNBackSequence,
  levelFromModeId,
  modeIdFromNBackLevel,
  normalizeNBackSetup
} from "../../src/features/nback/engine";

describe("nback engine", () => {
  it("normalizes setup defaults", () => {
    expect(normalizeNBackSetup(null)).toEqual({ level: 1, durationSec: 60 });
    expect(normalizeNBackSetup({ level: 2, durationSec: 90 })).toEqual({
      level: 2,
      durationSec: 90
    });
  });

  it("maps level and mode ids", () => {
    expect(modeIdFromNBackLevel(1)).toBe("nback_1");
    expect(modeIdFromNBackLevel(2)).toBe("nback_2");
    expect(levelFromModeId("nback_1")).toBe(1);
    expect(levelFromModeId("nback_2")).toBe(2);
    expect(levelFromModeId("classic_plus")).toBeNull();
  });

  it("calculates steps from duration", () => {
    expect(calculateNBackSteps(60)).toBe(40);
    expect(calculateNBackSteps(90)).toBe(60);
  });

  it("generates sequence with valid cell indexes", () => {
    const randomValues = [0.12, 0.41, 0.73, 0.26, 0.84];
    let cursor = 0;
    const sequence = generateNBackSequence(40, 2, () => {
      const value = randomValues[cursor % randomValues.length] ?? 0.5;
      cursor += 1;
      return value;
    });
    expect(sequence).toHaveLength(40);
    sequence.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(9);
    });
  });

  it("evaluates hits, misses and false alarms correctly", () => {
    const sequence = [0, 1, 0, 1, 2, 2];
    // level=2 => targets at indexes: 2 (0==0), 3 (1==1), 4 (2!=0), 5 (2!=1)
    const responses: Array<boolean | undefined> = [
      undefined, // warmup
      undefined, // warmup
      true, // hit
      false, // miss
      true, // false alarm
      undefined // correct reject
    ];

    const metrics = evaluateNBackSession({
      sequence,
      level: 2,
      responses,
      durationMs: 60000
    });

    expect(metrics.hit).toBe(1);
    expect(metrics.miss).toBe(1);
    expect(metrics.falseAlarm).toBe(1);
    expect(metrics.correctReject).toBe(3);
    expect(metrics.correctCount).toBe(4);
    expect(metrics.errors).toBe(2);
    expect(metrics.accuracy).toBeCloseTo(4 / 6, 6);
    expect(metrics.speed).toBeCloseTo(4, 6);
    expect(metrics.score).toBeCloseTo(4 * (0.7 + 0.3 * (4 / 6)), 6);
  });
});
