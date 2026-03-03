import { describe, expect, it } from "vitest";
import {
  evaluateMemoryGridSession,
  generateMemoryGridSequence,
  modeIdFromMemoryGridMode,
  normalizeMemoryGridSetup
} from "../../src/features/memory-grid/engine";

describe("memory-grid engine", () => {
  it("normalizes setup with difficulty constraints", () => {
    const setup = normalizeMemoryGridSetup({
      difficulty: "kids",
      gridSize: 4,
      startLevel: 9,
      mode: "rush",
      durationSec: 90
    });

    expect(setup.difficulty).toBe("kids");
    expect(setup.gridSize).toBe(3);
    expect(setup.startLevel).toBe(5);
    expect(setup.mode).toBe("rush");
    expect(setup.durationSec).toBe(90);
  });

  it("maps modeId from mode/difficulty/size", () => {
    expect(modeIdFromMemoryGridMode("classic", "standard", 3)).toBe("memory_grid_classic");
    expect(modeIdFromMemoryGridMode("classic", "pro", 4)).toBe("memory_grid_classic_pro_4x4");
    expect(modeIdFromMemoryGridMode("rush", "kids", 3)).toBe("memory_grid_rush_kids");
  });

  it("generates sequence without immediate repeats", () => {
    const sequence = generateMemoryGridSequence(30, 3, () => Math.random());
    expect(sequence).toHaveLength(30);
    for (let index = 1; index < sequence.length; index += 1) {
      expect(sequence[index]).not.toBe(sequence[index - 1]);
    }
  });

  it("evaluates classic mode and stops on first error", () => {
    const metrics = evaluateMemoryGridSession({
      mode: "classic",
      startLevel: 1,
      sequences: [
        [1, 2],
        [2, 3, 4],
        [4, 5, 6, 7]
      ],
      userResponses: [
        [1, 2],
        [2, 3, 0],
        [4, 5, 6, 7]
      ],
      recallTimesMs: [1200, 1900, 2200]
    });

    expect(metrics.totalSequences).toBe(2);
    expect(metrics.correct).toBe(1);
    expect(metrics.errors).toBe(1);
    expect(metrics.accuracy).toBeCloseTo(0.5, 4);
  });

  it("evaluates rush mode across all rounds", () => {
    const metrics = evaluateMemoryGridSession({
      mode: "rush",
      startLevel: 2,
      sequences: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ],
      userResponses: [
        [1, 2, 3],
        [4, 0, 6],
        [7, 8, 9]
      ],
      recallTimesMs: [1500, 1800, 1700]
    });

    expect(metrics.totalSequences).toBe(3);
    expect(metrics.correct).toBe(2);
    expect(metrics.errors).toBe(1);
    expect(metrics.spanMax).toBe(3);
    expect(metrics.score).toBeGreaterThan(0);
  });
});
