import { describe, expect, it } from "vitest";
import {
  getSchulteLevelDefaults,
  getTargetSpeedPerMinute,
  withSchulteLevelDefaults
} from "../../src/features/schulte/levelConfig";
import { getPresetSetup } from "../../src/shared/lib/training/presets";

describe("schulte level config", () => {
  it("maps low levels to 3x3 with hints", () => {
    const l1Classic = getSchulteLevelDefaults(1, "classic_plus");
    expect(l1Classic.gridSize).toBe(3);
    expect(l1Classic.hintsEnabled).toBe(true);

    const l1Timed = getSchulteLevelDefaults(1, "timed_plus");
    expect(l1Timed.timedBaseClear).toBe(true);
    expect(l1Timed.timeLimitSec).toBe(90);

    const l2Timed = getSchulteLevelDefaults(2, "timed_plus");
    expect(l2Timed.timedBaseClear).toBe(false);
  });

  it("enables shift only on high levels", () => {
    const l7 = getSchulteLevelDefaults(7, "classic_plus");
    expect(l7.shiftEnabled).toBe(false);

    const l9 = getSchulteLevelDefaults(9, "timed_plus");
    expect(l9.shiftEnabled).toBe(true);
    expect(l9.shiftIntervalSec).toBe(5);
    expect(l9.shiftSwaps).toBe(1);
  });

  it("applies level defaults into setup", () => {
    const base = getPresetSetup("standard");
    const updated = withSchulteLevelDefaults(base, 10, "timed_plus");
    expect(updated.gridSize).toBe(6);
    expect(updated.timeLimitSec).toBe(30);
    expect(updated.shiftEnabled).toBe(true);
    expect(updated.shiftSwaps).toBe(2);
  });

  it("provides positive target speed for each schulte mode", () => {
    expect(getTargetSpeedPerMinute("classic_plus", 3)).toBeGreaterThan(0);
    expect(getTargetSpeedPerMinute("timed_plus", 5)).toBeGreaterThan(0);
    expect(getTargetSpeedPerMinute("reverse", 6)).toBeGreaterThan(0);
  });
});
