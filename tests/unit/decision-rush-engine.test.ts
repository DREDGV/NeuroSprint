import { describe, expect, it } from "vitest";
import {
  adaptDecisionIntervalMs,
  createDecisionRushTrial,
  evaluateDecisionRushSession,
  levelFromDecisionModeId,
  modeIdFromDecisionLevel,
  normalizeDecisionRushSetup,
  resolveDecisionPhase,
  type DecisionRushTrialResult
} from "../../src/features/decision-rush/engine";

describe("decision rush engine", () => {
  it("maps level <-> modeId and normalizes setup", () => {
    expect(modeIdFromDecisionLevel("kids")).toBe("decision_kids");
    expect(modeIdFromDecisionLevel("standard")).toBe("decision_standard");
    expect(modeIdFromDecisionLevel("pro")).toBe("decision_pro");

    expect(levelFromDecisionModeId("decision_kids")).toBe("kids");
    expect(levelFromDecisionModeId("decision_standard")).toBe("standard");
    expect(levelFromDecisionModeId("decision_pro")).toBe("pro");
    expect(levelFromDecisionModeId("classic_plus")).toBeNull();

    expect(normalizeDecisionRushSetup(undefined)).toEqual({
      level: "standard",
      durationSec: 60
    });
    expect(normalizeDecisionRushSetup({ level: "kids", durationSec: 90 })).toEqual({
      level: "kids",
      durationSec: 90
    });
  });

  it("builds boss phase trial with stroop fields", () => {
    const trial = createDecisionRushTrial("standard", "boss");
    expect(trial.phase).toBe("boss");
    expect(trial.stimulus.stroopWord).toBeTruthy();
    expect(trial.stimulus.stroopInk).toBeTruthy();
    expect(trial.correctAnswer === "yes" || trial.correctAnswer === "no").toBe(true);
  });

  it("resolves phases by elapsed time", () => {
    expect(resolveDecisionPhase(0, 60)).toBe("warmup");
    expect(resolveDecisionPhase(20_000, 60)).toBe("core");
    expect(resolveDecisionPhase(58_000, 60)).toBe("boss");
  });

  it("adapts interval by recent accuracy and stability", () => {
    const strongWindow: DecisionRushTrialResult[] = Array.from({ length: 10 }, () => ({
      phase: "core",
      correct: true,
      answer: "yes",
      reactionMs: 540,
      intervalMs: 1000
    }));
    const weakWindow: DecisionRushTrialResult[] = Array.from({ length: 10 }, () => ({
      phase: "core",
      correct: false,
      answer: "no",
      reactionMs: 1200,
      intervalMs: 1000
    }));

    expect(adaptDecisionIntervalMs(1000, strongWindow, () => 0)).toBeLessThan(1000);
    expect(adaptDecisionIntervalMs(1000, weakWindow, () => 0)).toBeGreaterThan(1000);
  });

  it("evaluates session metrics and score", () => {
    const results: DecisionRushTrialResult[] = [
      { phase: "warmup", correct: true, answer: "yes", reactionMs: 600, intervalMs: 1100 },
      { phase: "core", correct: true, answer: "yes", reactionMs: 620, intervalMs: 980 },
      { phase: "core", correct: false, answer: "no", reactionMs: 980, intervalMs: 980 },
      { phase: "boss", correct: true, answer: "yes", reactionMs: 700, intervalMs: 900 }
    ];

    const metrics = evaluateDecisionRushSession(results, 60_000);
    expect(metrics.trialsTotal).toBe(3);
    expect(metrics.correctCount).toBe(2);
    expect(metrics.errors).toBe(1);
    expect(metrics.accuracy).toBeCloseTo(2 / 3, 4);
    expect(metrics.bestCombo).toBeGreaterThanOrEqual(1);
    expect(metrics.score).toBeGreaterThan(0);
  });
});
