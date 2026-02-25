import { describe, expect, it } from "vitest";
import {
  DEFAULT_SPRINT_MATH_SETUP,
  buildSprintMathTask,
  calcSprintMathMetrics,
  normalizeSprintMathSetup
} from "../../src/features/sprint-math/contract";

describe("sprint math contract", () => {
  it("normalizes empty setup to defaults", () => {
    const setup = normalizeSprintMathSetup(null);
    expect(setup).toEqual(DEFAULT_SPRINT_MATH_SETUP);
  });

  it("normalizes invalid values and disables division for kids", () => {
    const setup = normalizeSprintMathSetup({
      modeId: "mixed",
      tierId: "kids",
      sessionSec: 999 as never,
      maxOperand: 900,
      allowDivision: true,
      autoEnter: false
    });

    expect(setup.modeId).toBe("mixed");
    expect(setup.sessionSec).toBe(60);
    expect(setup.maxOperand).toBe(200);
    expect(setup.allowDivision).toBe(false);
    expect(setup.autoEnter).toBe(false);
  });

  it("calculates metrics with stable formula", () => {
    const metrics = calcSprintMathMetrics({
      correctCount: 24,
      errors: 6,
      sessionSec: 60,
      solveTimesMs: [1000, 1200, 1100],
      streakBest: 8
    });

    expect(metrics.throughput).toBeCloseTo(24, 5);
    expect(metrics.accuracy).toBeCloseTo(0.8, 5);
    expect(metrics.avgSolveMs).toBeCloseTo(1100, 5);
    expect(metrics.streakBest).toBe(8);
    expect(metrics.score).toBeCloseTo(22.56, 2);
  });

  it("generates deterministic integer division tasks for mixed mode", () => {
    const setup = normalizeSprintMathSetup({
      modeId: "mixed",
      tierId: "pro",
      allowDivision: true,
      maxOperand: 60
    });

    const randomSeq = [0.99, 0.5, 0.2];
    let index = 0;
    const task = buildSprintMathTask(setup, () => {
      const value = randomSeq[index] ?? 0.5;
      index += 1;
      return value;
    });

    expect(task.operator).toBe("/");
    expect(task.right).toBeGreaterThan(0);
    expect(task.left % task.right).toBe(0);
    expect(task.answer).toBe(task.left / task.right);
  });
});
