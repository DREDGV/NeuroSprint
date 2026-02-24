import { db } from "../../db/database";
import { createId } from "../../shared/lib/id";
import { DEFAULT_AUDIO_SETTINGS } from "../../shared/lib/audio/audioSettings";
import type {
  AudioSettings,
  SchulteThemeConfig,
  SchulteThemeId,
  UserPreference
} from "../../shared/types/domain";

function defaultPreference(userId: string): UserPreference {
  return {
    id: createId(),
    userId,
    schulteThemeId: "classic_bw",
    schulteCustomTheme: null,
    audioSettings: { ...DEFAULT_AUDIO_SETTINGS },
    updatedAt: new Date().toISOString()
  };
}

export const preferenceRepository = {
  async getOrCreate(userId: string): Promise<UserPreference> {
    const existing = await db.userPreferences.where("userId").equals(userId).first();
    if (existing) {
      return existing;
    }

    const created = defaultPreference(userId);
    await db.userPreferences.add(created);
    return created;
  },

  async saveSchulteTheme(
    userId: string,
    themeId: SchulteThemeId,
    customTheme: Partial<SchulteThemeConfig> | null
  ): Promise<void> {
    const current = await this.getOrCreate(userId);
    await db.userPreferences.put({
      ...current,
      schulteThemeId: themeId,
      schulteCustomTheme: customTheme,
      updatedAt: new Date().toISOString()
    });
  },

  async saveAudioSettings(userId: string, audioSettings: AudioSettings): Promise<void> {
    const current = await this.getOrCreate(userId);
    await db.userPreferences.put({
      ...current,
      audioSettings,
      updatedAt: new Date().toISOString()
    });
  }
};
