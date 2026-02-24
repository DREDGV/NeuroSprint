import { AUDIO_SETTINGS_KEY } from "../../constants/storage";
import type { AudioSettings } from "../../types/domain";

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  muted: false,
  volume: 0.35,
  startEnd: true,
  click: false,
  correct: false,
  error: false
};

function normalizeVolume(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_AUDIO_SETTINGS.volume;
  }
  return Math.max(0, Math.min(1, Number(value)));
}

export function getAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_AUDIO_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      muted: Boolean(parsed.muted),
      volume: normalizeVolume(parsed.volume),
      startEnd:
        typeof parsed.startEnd === "boolean"
          ? parsed.startEnd
          : DEFAULT_AUDIO_SETTINGS.startEnd,
      click:
        typeof parsed.click === "boolean" ? parsed.click : DEFAULT_AUDIO_SETTINGS.click,
      correct:
        typeof parsed.correct === "boolean"
          ? parsed.correct
          : DEFAULT_AUDIO_SETTINGS.correct,
      error:
        typeof parsed.error === "boolean" ? parsed.error : DEFAULT_AUDIO_SETTINGS.error
    };
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  const normalized: AudioSettings = {
    ...settings,
    volume: normalizeVolume(settings.volume)
  };
  localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(normalized));
}

export function mergeAudioSettings(
  base: AudioSettings,
  override: Partial<AudioSettings> | null | undefined
): AudioSettings {
  if (!override) {
    return base;
  }
  return {
    muted: typeof override.muted === "boolean" ? override.muted : base.muted,
    volume: normalizeVolume(override.volume ?? base.volume),
    startEnd:
      typeof override.startEnd === "boolean" ? override.startEnd : base.startEnd,
    click: typeof override.click === "boolean" ? override.click : base.click,
    correct: typeof override.correct === "boolean" ? override.correct : base.correct,
    error: typeof override.error === "boolean" ? override.error : base.error
  };
}
