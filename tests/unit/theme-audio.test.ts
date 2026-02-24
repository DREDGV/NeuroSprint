import { describe, expect, it } from "vitest";
import { mergeAudioSettings, DEFAULT_AUDIO_SETTINGS } from "../../src/shared/lib/audio/audioSettings";
import { resolveSchulteTheme } from "../../src/shared/lib/training/themes";

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
});
