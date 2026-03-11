import { db } from "../../db/database";
import { createId } from "../../shared/lib/id";
import {
  ACHIEVEMENT_CATALOG,
  getActiveAchievementModuleIds
} from "../../shared/lib/progress/achievementList";
import type {
  UserAchievement,
  Achievement,
  AchievementEvent,
  TrainingModuleId
} from "../../shared/types/domain";

/**
 * Получить все достижения пользователя
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  return db.userAchievements
    .where("userId")
    .equals(userId)
    .sortBy("createdAt");
}

/**
 * Получить конкретное достижение пользователя
 */
export async function getUserAchievement(
  userId: string,
  achievementId: string
): Promise<UserAchievement | null> {
  return (await db.userAchievements
    .where("[userId+achievementId]")
    .equals([userId, achievementId])
    .first()) ?? null;
}

/**
 * Создать или обновить достижение пользователя
 */
async function upsertUserAchievement(
  userId: string,
  achievementId: string,
  progress: number,
  completed: boolean
): Promise<UserAchievement> {
  const existing = await getUserAchievement(userId, achievementId);
  const now = new Date().toISOString();
  
  if (existing) {
    const updated: UserAchievement = {
      ...existing,
      progress,
      completed,
      completedAt: completed && !existing.completed ? now : existing.completedAt,
      updatedAt: now
    };
    await db.userAchievements.update(existing.id, updated);
    return updated;
  }
  
  const newAchievement: UserAchievement = {
    id: createId(),
    userId,
    achievementId,
    progress,
    completed,
    completedAt: completed ? now : null,
    createdAt: now,
    updatedAt: now
  };
  await db.userAchievements.put(newAchievement);
  return newAchievement;
}

function collectUnlockedAchievement(
  existing: UserAchievement | null,
  updated: UserAchievement,
  achievement: Achievement
): Achievement | null {
  if (!updated.completed || existing?.completed) {
    return null;
  }
  return achievement;
}

/**
 * Проверить условие достижения
 */
function checkAchievementCondition(
  achievement: Achievement,
  event: AchievementEvent
): { progress: number; completed: boolean } {
  const { type, value } = achievement.condition;
  
  switch (type) {
    case "streak_days":
      if (event.type !== "streak_updated" || !event.streakDays) {
        return { progress: 0, completed: false };
      }
      return {
        progress: Math.min(100, Math.round((event.streakDays / value) * 100)),
        completed: event.streakDays >= value
      };
    
    case "sessions_total":
      if (event.type !== "session_completed" || !event.totalSessions) {
        return { progress: 0, completed: false };
      }
      return {
        progress: Math.min(100, Math.round((event.totalSessions / value) * 100)),
        completed: event.totalSessions >= value
      };
    
    case "sessions_today":
      if (event.type !== "session_completed" || !event.sessionsToday) {
        return { progress: 0, completed: false };
      }
      return {
        progress: Math.min(100, Math.round((event.sessionsToday / value) * 100)),
        completed: event.sessionsToday >= value
      };
    
    case "module_sessions":
      if (event.type !== "session_completed" || !event.moduleId) {
        return { progress: 0, completed: false };
      }
      // Для module_sessions нужен отдельный подсчёт (упрощённо)
      return { progress: 0, completed: false };
    
    case "all_modules":
      // Проверяется отдельно через session history
      return { progress: 0, completed: false };
    
    case "level_reached":
      // Проверяется отдельно через user level
      return { progress: 0, completed: false };
    
    case "perfect_day":
      if (event.type !== "daily_completed" || !event.sessionsToday) {
        return { progress: 0, completed: false };
      }
      return {
        progress: Math.min(100, Math.round((event.sessionsToday / value) * 100)),
        completed: event.sessionsToday >= value
      };
    
    default:
      return { progress: 0, completed: false };
  }
}

/**
 * Обработать событие и проверить достижения
 */
export async function processAchievementEvent(
  userId: string,
  event: AchievementEvent
): Promise<{
  updatedAchievements: UserAchievement[];
  newlyUnlocked: Achievement[];
}> {
  const newlyUnlocked: Achievement[] = [];
  const updatedAchievements: UserAchievement[] = [];
  
  // Проверяем все достижения
  for (const achievement of ACHIEVEMENT_CATALOG) {
    // Пропускаем если уже получено
    const existing = await getUserAchievement(userId, achievement.id);
    if (existing?.completed) {
      continue;
    }
    
    const { progress, completed } = checkAchievementCondition(achievement, event);
    
    if (progress > 0 || completed) {
      const updated = await upsertUserAchievement(
        userId,
        achievement.id,
        progress,
        completed
      );
      updatedAchievements.push(updated);

      const unlocked = collectUnlockedAchievement(existing, updated, achievement);
      if (unlocked) {
        newlyUnlocked.push(unlocked);
      }
    }
  }
  
  return {
    updatedAchievements,
    newlyUnlocked
  };
}

/**
 * Получить прогресс для module_sessions достижения
 */
export async function updateModuleSessionProgress(
  userId: string,
  moduleId: TrainingModuleId,
  sessionCount: number
): Promise<{
  updatedAchievements: UserAchievement[];
  newlyUnlocked: Achievement[];
}> {
  const updated: UserAchievement[] = [];
  const newlyUnlocked: Achievement[] = [];
  
  // Находим все module_sessions достижения для этого модуля
  const moduleAchievements = ACHIEVEMENT_CATALOG.filter(
    a => a.condition.type === "module_sessions" && a.condition.moduleId === moduleId
  );
  
  for (const achievement of moduleAchievements) {
    const existing = await getUserAchievement(userId, achievement.id);
    if (existing?.completed) continue;
    
    const value = achievement.condition.value;
    const progress = Math.min(100, Math.round((sessionCount / value) * 100));
    const completed = sessionCount >= value;
    
    const updatedAchievement = await upsertUserAchievement(
      userId,
      achievement.id,
      progress,
      completed
    );
    updated.push(updatedAchievement);

    const unlocked = collectUnlockedAchievement(existing, updatedAchievement, achievement);
    if (unlocked) {
      newlyUnlocked.push(unlocked);
    }
  }

  return {
    updatedAchievements: updated,
    newlyUnlocked
  };
}

/**
 * Проверить all_modules достижение
 */
export async function checkAllModulesAchievement(
  userId: string,
  modulesCompleted: Set<TrainingModuleId>
): Promise<{
  updatedAchievement: UserAchievement | null;
  newlyUnlocked: Achievement[];
}> {
  const allModulesAchievement = ACHIEVEMENT_CATALOG.find(
    a => a.condition.type === "all_modules"
  );
  
  if (!allModulesAchievement) {
    return {
      updatedAchievement: null,
      newlyUnlocked: []
    };
  }
  
  const existing = await getUserAchievement(userId, allModulesAchievement.id);
  if (existing?.completed) {
    return {
      updatedAchievement: null,
      newlyUnlocked: []
    };
  }
  
  const requiredModules = allModulesAchievement.condition.value;
  const activeModuleIds = new Set(getActiveAchievementModuleIds());
  const completedCount = [...modulesCompleted].filter((moduleId) => activeModuleIds.has(moduleId))
    .length;
  const progress = Math.min(100, Math.round((completedCount / requiredModules) * 100));
  const completed = completedCount >= requiredModules;
  
  const updatedAchievement = await upsertUserAchievement(
    userId,
    allModulesAchievement.id,
    progress,
    completed
  );

  const unlocked = collectUnlockedAchievement(existing, updatedAchievement, allModulesAchievement);

  return {
    updatedAchievement,
    newlyUnlocked: unlocked ? [unlocked] : []
  };
}

/**
 * Проверить level_reached достижение
 */
export async function checkLevelAchievement(
  userId: string,
  level: number
): Promise<{
  updatedAchievements: UserAchievement[];
  newlyUnlocked: Achievement[];
}> {
  const updated: UserAchievement[] = [];
  const newlyUnlocked: Achievement[] = [];
  
  const levelAchievements = ACHIEVEMENT_CATALOG.filter(
    a => a.condition.type === "level_reached"
  );
  
  for (const achievement of levelAchievements) {
    const existing = await getUserAchievement(userId, achievement.id);
    if (existing?.completed) continue;
    
    const requiredLevel = achievement.condition.value;
    if (level >= requiredLevel) {
      const updatedAchievement = await upsertUserAchievement(
        userId,
        achievement.id,
        100,
        true
      );
      updated.push(updatedAchievement);

      const unlocked = collectUnlockedAchievement(existing, updatedAchievement, achievement);
      if (unlocked) {
        newlyUnlocked.push(unlocked);
      }
    }
  }

  return {
    updatedAchievements: updated,
    newlyUnlocked
  };
}

/**
 * Получить доступные достижения (которые ещё не получены)
 */
export async function getAvailableAchievements(userId: string): Promise<Achievement[]> {
  const userAchievements = await getUserAchievements(userId);
  const completedIds = new Set(
    userAchievements.filter(a => a.completed).map(a => a.achievementId)
  );
  
  return ACHIEVEMENT_CATALOG.filter(
    a => !completedIds.has(a.id) && !a.hidden
  );
}

/**
 * Получить полный прогресс достижений пользователя
 */
export async function getAchievementProgress(userId: string): Promise<{
  total: number;
  completed: number;
  inProgress: number;
  completionPct: number;
}> {
  const userAchievements = await getUserAchievements(userId);
  const visibleCatalog = ACHIEVEMENT_CATALOG.filter(a => !a.hidden);
  
  const completed = userAchievements.filter(a => a.completed).length;
  const inProgress = userAchievements.filter(a => !a.completed && a.progress > 0).length;
  
  return {
    total: visibleCatalog.length,
    completed,
    inProgress,
    completionPct: visibleCatalog.length > 0
      ? Math.round((completed / visibleCatalog.length) * 100)
      : 0
  };
}

export const achievementRepository = {
  getUserAchievements,
  getUserAchievement,
  processAchievementEvent,
  updateModuleSessionProgress,
  checkAllModulesAchievement,
  checkLevelAchievement,
  getAvailableAchievements,
  getAchievementProgress
};
