import { SETTINGS_KEY } from "../../constants/storage";
import type { AppSettings } from "../../types/domain";

export const DEFAULT_SETTINGS: AppSettings = {
  timedDefaultLimitSec: 60,
  timedErrorPenalty: 0.5,
  dailyGoalSessions: 3
};

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const limit = parsed.timedDefaultLimitSec;
    const penalty = parsed.timedErrorPenalty;
    const dailyGoalSessions = parsed.dailyGoalSessions;

    return {
      timedDefaultLimitSec:
        limit === 30 || limit === 45 || limit === 60 || limit === 90
          ? limit
          : DEFAULT_SETTINGS.timedDefaultLimitSec,
      timedErrorPenalty:
        typeof penalty === "number" && Number.isFinite(penalty) && penalty >= 0
          ? penalty
          : DEFAULT_SETTINGS.timedErrorPenalty,
      dailyGoalSessions:
        typeof dailyGoalSessions === "number" &&
        Number.isFinite(dailyGoalSessions) &&
        dailyGoalSessions >= 1
          ? Math.round(dailyGoalSessions)
          : DEFAULT_SETTINGS.dailyGoalSessions
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
