import { describe, expect, it } from "vitest";
import {
  getPresetSetup,
  mapLevelToDefaults,
  withLevelDefaults
} from "../../src/shared/lib/training/presets";

describe("training presets", () => {
  it("returns configured preset values", () => {
    const easy = getPresetSetup("easy");
    expect(easy.gridSize).toBe(3);
    expect(easy.errorPenalty).toBe(0.25);
    expect(easy.hintsEnabled).toBe(true);
  });

  it("maps level ranges to defaults", () => {
    expect(mapLevelToDefaults(1, "classic_plus").gridSize).toBe(3);
    expect(mapLevelToDefaults(4, "classic_plus").gridSize).toBe(4);
    expect(mapLevelToDefaults(9, "classic_plus").gridSize).toBe(6);
  });

  it("applies level defaults over setup", () => {
    const base = getPresetSetup("standard");
    const updated = withLevelDefaults(base, 8, "timed_plus");
    expect(updated.gridSize).toBe(6);
    expect(updated.errorPenalty).toBe(0.75);
    expect(updated.timeLimitSec).toBe(45);
  });
});
