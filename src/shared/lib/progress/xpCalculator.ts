import { XP_CONFIG, xpToNextLevel } from "./achievementList";
import type { UserLevel, XPSource } from "../../types/domain";

/**
 * Рассчитать общее XP для достижения уровня
 */
export function totalXPForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpToNextLevel(i);
  }
  return total;
}

/**
 * Рассчитать текущий уровень по общему XP
 */
export function levelFromTotalXP(totalXP: number): number {
  let level = 1;
  let remaining = totalXP;
  
  while (remaining >= xpToNextLevel(level)) {
    remaining -= xpToNextLevel(level);
    level++;
  }
  
  return level;
}

/**
 * Добавить XP пользователю и вернуть обновлённый уровень
 */
export function addXP(
  currentLevel: UserLevel,
  amount: number
): { level: UserLevel; leveledUp: boolean; levelsGained: number } {
  const newTotalXP = currentLevel.totalXP + amount;
  const newLevel = levelFromTotalXP(newTotalXP);
  const levelsGained = Math.max(0, newLevel - currentLevel.level);
  
  // Рассчитываем XP на текущем уровне
  const xpForPreviousLevels = totalXPForLevel(newLevel);
  const newCurrentXP = newTotalXP - xpForPreviousLevels;
  const newXpToNext = xpToNextLevel(newLevel);
  
  const now = new Date().toISOString();
  
  return {
    level: {
      ...currentLevel,
      level: newLevel,
      currentXP: newCurrentXP,
      totalXP: newTotalXP,
      xpToNextLevel: newXpToNext,
      lastLevelUpAt: levelsGained > 0 ? now : currentLevel.lastLevelUpAt,
      updatedAt: now
    },
    leveledUp: levelsGained > 0,
    levelsGained
  };
}

/**
 * Рассчитать XP за сессию с учётом streak множителя
 */
export function calculateSessionXP(streakDays: number = 0): number {
  const multiplier = Math.min(
    XP_CONFIG.maxStreakMultiplier,
    1 + (streakDays * XP_CONFIG.streakBonusMultiplier)
  );
  return Math.round(XP_CONFIG.baseXPPerSession * multiplier);
}

/**
 * Получить описание источника XP
 */
export function getXPSourceDescription(source: XPSource, amount: number): string {
  switch (source) {
    case "session":
      return `+${amount} XP за сессию`;
    case "daily_complete":
      return `+${amount} XP за выполнение дневной цели`;
    case "streak_bonus":
      return `+${amount} XP бонус за серию`;
    case "achievement":
      return `+${amount} XP за достижение`;
    case "level_up":
      return `+${amount} XP за повышение уровня`;
    default:
      return `+${amount} XP`;
  }
}

/**
 * Проверить, готов ли пользователь к повышению уровня
 */
export function isCloseToLevelUp(level: UserLevel, thresholdPct: number = 0.8): boolean {
  const progressPct = level.currentXP / level.xpToNextLevel;
  return progressPct >= thresholdPct;
}

/**
 * Получить прогресс до следующего уровня в процентах
 */
export function getLevelProgress(level: UserLevel): number {
  if (level.xpToNextLevel === 0) return 100;
  return Math.min(100, Math.round((level.currentXP / level.xpToNextLevel) * 100));
}
