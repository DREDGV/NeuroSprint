import { describe, expect, it } from "vitest";
import {
  createRound,
  evaluateAttempt,
  getPreviewRound,
  rotateCell,
  toggleSelection,
  transformPattern
} from "../../src/shared/lib/training/blockPatternGame";

describe("blockPatternGame", () => {
  it("rotates cells correctly for 90, 180 and 270 degrees", () => {
    expect(rotateCell(0, 90)).toBe(3);
    expect(rotateCell(0, 180)).toBe(15);
    expect(rotateCell(0, 270)).toBe(12);
  });

  it("builds deterministic preview rounds", () => {
    expect(getPreviewRound("classic")).toMatchObject({
      basePattern: [0, 1, 5],
      expectedPattern: [0, 1, 5],
      rotationAngle: 90
    });

    expect(getPreviewRound("rotation")).toMatchObject({
      basePattern: [0, 1, 5],
      expectedPattern: [3, 6, 7],
      rotationAngle: 90
    });

    expect(getPreviewRound("mirror")).toMatchObject({
      basePattern: [0, 1, 5],
      expectedPattern: [2, 3, 6],
      rotationAngle: 90
    });
  });

  it("creates rounds with transformed expected patterns", () => {
    const randomValues = [0.11, 0.88, 0.45, 0.72, 0.31, 0.02, 0.56, 0.67, 0.21, 0.91];
    let callIndex = 0;
    const random = () => randomValues[callIndex++ % randomValues.length] ?? 0.1;

    const round = createRound(3, "rotation", random);

    expect(round.basePattern).toHaveLength(3);
    expect(round.expectedPattern).toHaveLength(3);
    expect(round.selectionLimit).toBe(3);
    expect(transformPattern(round.basePattern, "rotation", round.rotationAngle)).toEqual(
      round.expectedPattern
    );
  });

  it("prevents selecting more cells than the round allows", () => {
    let state = new Set<number>();

    state = toggleSelection(state, 1, 2).next;
    state = toggleSelection(state, 2, 2).next;
    const thirdToggle = toggleSelection(state, 3, 2);

    expect(thirdToggle.limitReached).toBe(true);
    expect(Array.from(thirdToggle.next).sort((left, right) => left - right)).toEqual([1, 2]);
  });

  it("scores only the exact transformed answer highly", () => {
    const expectedPattern = [3, 6, 7];

    const perfect = evaluateAttempt(expectedPattern, [3, 6, 7]);
    const greedy = evaluateAttempt(expectedPattern, [3, 6, 7, 10]);
    const partial = evaluateAttempt(expectedPattern, [3, 6]);

    expect(perfect.isPerfect).toBe(true);
    expect(perfect.accuracyPercent).toBe(100);
    expect(perfect.score).toBeGreaterThan(greedy.score);
    expect(greedy.falseHits).toBe(1);
    expect(partial.misses).toBe(1);
    expect(partial.accuracyPercent).toBeLessThan(perfect.accuracyPercent);
  });
});
