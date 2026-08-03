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
    expect(normalizeNBackSetup(null)).toEqual({ level: 1, gridSize: 3, durationSec: 60, tutorialMode: false });
    expect(normalizeNBackSetup({ level: 2, gridSize: 4, durationSec: 90 })).toEqual({
      level: 2,
      gridSize: 4,
      durationSec: 90,
      tutorialMode: false
    });
    expect(normalizeNBackSetup({ level: 3, gridSize: 3, durationSec: 120 })).toEqual({
      level: 3,
      gridSize: 3,
      durationSec: 120,
      tutorialMode: false
    });
  });

  it("maps level and mode ids", () => {
    expect(modeIdFromNBackLevel(1, 3)).toBe("nback_1");
    expect(modeIdFromNBackLevel(1, 4)).toBe("nback_1_4x4");
    expect(modeIdFromNBackLevel(2, 3)).toBe("nback_2");
    expect(modeIdFromNBackLevel(2, 4)).toBe("nback_2_4x4");
    expect(modeIdFromNBackLevel(3, 3)).toBe("nback_3");
    expect(levelFromModeId("nback_1")).toEqual({ level: 1, gridSize: 3 });
    expect(levelFromModeId("nback_1_4x4")).toEqual({ level: 1, gridSize: 4 });
    expect(levelFromModeId("nback_2")).toEqual({ level: 2, gridSize: 3 });
    expect(levelFromModeId("nback_2_4x4")).toEqual({ level: 2, gridSize: 4 });
    expect(levelFromModeId("nback_3")).toEqual({ level: 3, gridSize: 3 });
    expect(levelFromModeId("classic_plus")).toBeNull();
  });

  it("calculates steps from duration and level", () => {
    // Level 1: cycleMs = 1000 + 1000 + 1000 = 3000ms
    // 60s → 20 steps, 90s → 30 steps, 120s → 40 steps
    const steps60 = calculateNBackSteps(60, 1);
    const steps90 = calculateNBackSteps(90, 1);
    const steps120 = calculateNBackSteps(120, 1);

    expect(steps60).toBe(20);
    expect(steps90).toBe(30);
    expect(steps120).toBe(40);
    expect(steps60).toBeLessThan(steps90);
    expect(steps90).toBeLessThan(steps120);
  });

  it("calculates steps for different levels", () => {
    // Level 2: cycleMs = 800 + 1000 + 1000 = 2800ms
    const stepsL2 = calculateNBackSteps(60, 2);
    // Level 3: cycleMs = 800 + 1200 + 1000 = 3000ms
    const stepsL3 = calculateNBackSteps(60, 3);

    expect(stepsL2).toBe(21);
    expect(stepsL3).toBe(20);
    // Minimum is level + 1
    expect(stepsL2).toBeGreaterThanOrEqual(3);
    expect(stepsL3).toBeGreaterThanOrEqual(4);
  });

  it("respects minimum steps for level", () => {
    // For very short durations, minimum should be level + 1
    // With 0 seconds, should still return minimum
    const steps0 = calculateNBackSteps(0 as any, 1);
    expect(steps0).toBeGreaterThanOrEqual(2);
  });

  it("generates sequence with valid cell indexes", () => {
    const randomValues = [0.12, 0.41, 0.73, 0.26, 0.84];
    let cursor = 0;
    const sequence = generateNBackSequence(40, 2, 3, () => {
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
    // Score includes combo bonus: maxCombo = 3 (indexes 2,3,5), bonus = 1 + 3*0.05 = 1.15
    const expectedScore = 4 * (0.7 + 0.3 * (4 / 6)) * 1.15;
    expect(metrics.score).toBeCloseTo(expectedScore, 6);
    expect(metrics.maxCombo).toBe(3);
  });
});
