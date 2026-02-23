import { describe, expect, it } from "vitest";
import { generateSchulteGrid } from "../../src/shared/lib/random/grid";

describe("generateSchulteGrid", () => {
  it("returns 25 unique values from 1 to 25", () => {
    const grid = generateSchulteGrid(5);
    const sorted = [...grid].sort((a, b) => a - b);

    expect(grid).toHaveLength(25);
    expect(new Set(grid).size).toBe(25);
    expect(sorted[0]).toBe(1);
    expect(sorted[24]).toBe(25);
  });
});

