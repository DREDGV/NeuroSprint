import Dexie from "dexie";
import { db } from "../../db/database";
import { createId } from "../../shared/lib/id";
import {
  getAchievementById,
  getAchievementRewardXP
} from "../../shared/lib/progress/achievementList";
import {
  addXP,
  calculateSessionXP
} from "../../shared/lib/progress/xpCalculator";
import { XP_CONFIG, xpToNextLevel } from "../../shared/lib/progress/achievementList";
import type {
  UserLevel,
  XPLog,
  XPSource
} from "../../shared/types/domain";

/**
 * Получить или создать уровень пользователя
 */
async function getOrCreateUserLevel(userId: string): Promise<UserLevel> {
  let userLevel = await db.userLevels.get(userId);
  
  if (!userLevel) {
    userLevel = {
      id: userId,
      userId,
      level: 1,
      currentXP: 0,
      totalXP: 0,
      xpToNextLevel: xpToNextLevel(1),
      lastLevelUpAt: null,
      updatedAt: new Date().toISOString()
    };
    await db.userLevels.put(userLevel);
  }
  
  return userLevel;
}

async function grantXP(
  userId: string,
  source: XPSource,
  amount: number,
  metadata: Partial<Pick<XPLog, "sessionId" | "achievementId" | "streakDays">> = {}
): Promise<{ xpGranted: number; level: UserLevel; leveledUp: boolean }> {
  return db.transaction("rw", db.userLevels, db.xpLogs, async () => {
    const currentLevel = await getOrCreateUserLevel(userId);

    if (amount <= 0) {
      return {
        xpGranted: 0,
        level: currentLevel,
        leveledUp: false
      };
    }

    const xpLog: XPLog = {
      id: createId(),
      userId,
      source,
      amount,
      createdAt: new Date().toISOString(),
      ...metadata
    };
    await db.xpLogs.put(xpLog);

    const { level, leveledUp } = addXP(currentLevel, amount);
    await db.userLevels.put(level);

    return {
      xpGranted: amount,
      level,
      leveledUp
    };
  });
}

/**
 * Начислить XP за сессию
 */
export async function grantSessionXP(
  userId: string,
  streakDays: number = 0
): Promise<{ xpGranted: number; level: UserLevel; leveledUp: boolean }> {
  const xpGranted = calculateSessionXP(streakDays);
  return grantXP(userId, "session", xpGranted);
}

/**
 * Начислить XP за completion дня
 */
export async function grantDailyCompleteXP(
  userId: string
): Promise<{ xpGranted: number; level: UserLevel; leveledUp: boolean }> {
  return grantXP(userId, "daily_complete", XP_CONFIG.dailyCompleteBonus);
}

/**
 * Начислить XP за streak бонус
 */
export async function grantStreakBonusXP(
  userId: string,
  streakDays: number
): Promise<{ xpGranted: number; level: UserLevel; leveledUp: boolean }> {
  const bonusMultiplier = streakDays * XP_CONFIG.streakBonusMultiplier;
  const xpGranted = Math.round(XP_CONFIG.baseXPPerSession * bonusMultiplier);
  return grantXP(userId, "streak_bonus", xpGranted, { streakDays });
}

export async function grantAchievementXP(
  userId: string,
  achievementId: string
): Promise<{ xpGranted: number; level: UserLevel; leveledUp: boolean }> {
  const achievement = getAchievementById(achievementId);
  const xpGranted = achievement ? getAchievementRewardXP(achievement) : 0;
  return grantXP(userId, "achievement", xpGranted, { achievementId });
}

/**
 * Получить уровень пользователя
 */
export async function getUserLevel(userId: string): Promise<UserLevel | null> {
  return (await db.userLevels.get(userId)) ?? null;
}

/**
 * Получить последние XP logs
 */
export async function getRecentXPLogs(
  userId: string,
  limit: number = 10
): Promise<XPLog[]> {
  return db.xpLogs
    .where("[userId+createdAt]")
    .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Получить общую статистику XP
 */
export async function getXPStats(userId: string): Promise<{
  totalXP: number;
  currentLevel: number;
  sessionsWithXP: number;
  dailyBonuses: number;
  streakBonuses: number;
}> {
  const level = await getUserLevel(userId);
  const logs = await db.xpLogs
    .where("userId")
    .equals(userId)
    .toArray();
  
  return {
    totalXP: level?.totalXP ?? 0,
    currentLevel: level?.level ?? 1,
    sessionsWithXP: logs.filter(l => l.source === "session").length,
    dailyBonuses: logs.filter(l => l.source === "daily_complete").length,
    streakBonuses: logs.filter(l => l.source === "streak_bonus").length
  };
}

/**
 * Сбросить прогресс уровня (для тестов)
 */
export async function resetUserLevel(userId: string): Promise<void> {
  await db.userLevels.delete(userId);
  await db.xpLogs.where("userId").equals(userId).delete();
}

export const levelRepository = {
  getOrCreateUserLevel,
  grantSessionXP,
  grantDailyCompleteXP,
  grantStreakBonusXP,
  grantAchievementXP,
  getUserLevel,
  getRecentXPLogs,
  getXPStats,
  resetUserLevel
};
