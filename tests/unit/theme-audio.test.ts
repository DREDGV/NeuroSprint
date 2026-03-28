import { describe, expect, it } from "vitest";
import { mergeAudioSettings, DEFAULT_AUDIO_SETTINGS } from "../../src/shared/lib/audio/audioSettings";
import {
  SCHULTE_QUICK_THEME_OPTIONS,
  resolveSchulteTheme
} from "../../src/shared/lib/training/themes";

describe("theme and audio helpers", () => {
  it("resolves theme with fallback for invalid custom color", () => {
    const resolved = resolveSchulteTheme("soft", {
      boardBg: "#112233",
      numberColor: "bad-color"
    });

    expect(resolved.boardBg).toBe("#112233");
    expect(resolved.numberColor).toBe("#2d3f5f");
  });

  it("merges audio settings with clamped volume", () => {
    const merged = mergeAudioSettings(DEFAULT_AUDIO_SETTINGS, {
      muted: true,
      volume: 2,
      click: true
    });

    expect(merged.muted).toBe(true);
    expect(merged.volume).toBe(1);
    expect(merged.click).toBe(true);
    expect(merged.startEnd).toBe(true);
  });

  it("exposes readable light and dark monochrome presets for quick switching", () => {
    const light = resolveSchulteTheme("classic_bw", null);
    const dark = resolveSchulteTheme("contrast", null);

    expect(light.cellBg).toBe("#ffffff");
    expect(light.numberColor).toBe("#111111");
    expect(dark.cellBg).toBe("#171b21");
    expect(dark.numberColor).toBe("#ffffff");
    expect(SCHULTE_QUICK_THEME_OPTIONS.map((option) => option.id)).toEqual([
      "classic_bw",
      "contrast"
    ]);
  });
});
