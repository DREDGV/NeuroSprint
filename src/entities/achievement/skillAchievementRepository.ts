import { db } from "../../db/database";
import { createId } from "../../shared/lib/id";
import { SKILL_ACHIEVEMENT_CATALOG } from "../../shared/lib/progress/skillAchievementList";
import type {
  UserSkillAchievement,
  SkillAchievement,
  SkillProfileId
} from "../../shared/types/domain";

/**
 * Получить все skill достижения пользователя
 */
export async function getUserSkillAchievements(userId: string): Promise<UserSkillAchievement[]> {
  return db.userSkillAchievements
    .where("userId")
    .equals(userId)
    .sortBy("createdAt");
}

/**
 * Получить конкретное skill достижение пользователя
 */
export async function getUserSkillAchievement(
  userId: string,
  skillAchievementId: string
): Promise<UserSkillAchievement | null> {
  const result = await db.userSkillAchievements
    .where("[userId+skillAchievementId]")
    .equals([userId, skillAchievementId])
    .first();
  return result ?? null;
}

/**
 * Создать или обновить skill достижение пользователя
 */
async function upsertUserSkillAchievement(
  userId: string,
  skillAchievementId: string,
  skillScore: number,
  completed: boolean
): Promise<UserSkillAchievement> {
  const existing = await getUserSkillAchievement(userId, skillAchievementId);
  const now = new Date().toISOString();

  if (existing) {
    const updated: UserSkillAchievement = {
      ...existing,
      skillScore,
      completed,
      completedAt: completed && !existing.completed ? now : existing.completedAt,
      updatedAt: now
    };
    await db.userSkillAchievements.update(existing.id, updated);
    return updated;
  }

  const newAchievement: UserSkillAchievement = {
    id: createId(),
    userId,
    skillAchievementId,
    skillScore,
    completed,
    completedAt: completed ? now : null,
    createdAt: now,
    updatedAt: now
  };
  await db.userSkillAchievements.put(newAchievement);
  return newAchievement;
}

/**
 * Проверить и обновить все skill достижения пользователя на основе его навыков
 */
export async function checkSkillAchievements(
  userId: string,
  skillScores: Record<SkillProfileId, number>
): Promise<{
  updatedAchievements: UserSkillAchievement[];
  newlyUnlocked: SkillAchievement[];
}> {
  const updated: UserSkillAchievement[] = [];
  const newlyUnlocked: SkillAchievement[] = [];

  for (const achievement of SKILL_ACHIEVEMENT_CATALOG) {
    const existing = await getUserSkillAchievement(userId, achievement.id);
    if (existing?.completed) {
      continue;
    }

    const skillScore = skillScores[achievement.skillId];
    if (!skillScore) {
      continue;
    }

    const completed = skillScore >= achievement.threshold;
    if (completed || skillScore >= achievement.threshold * 0.5) {
      const updatedAchievement = await upsertUserSkillAchievement(
        userId,
        achievement.id,
        skillScore,
        completed
      );
      updated.push(updatedAchievement);

      if (completed && !existing) {
        newlyUnlocked.push(achievement);
      }
    }
  }

  return {
    updatedAchievements: updated,
    newlyUnlocked
  };
}

/**
 * Получить доступные skill достижения (которые ещё не получены)
 */
export async function getAvailableSkillAchievements(userId: string): Promise<SkillAchievement[]> {
  const userAchievements = await getUserSkillAchievements(userId);
  const completedIds = new Set(
    userAchievements.filter(a => a.completed).map(a => a.skillAchievementId)
  );

  return SKILL_ACHIEVEMENT_CATALOG.filter(
    a => !completedIds.has(a.id) && !a.hidden
  );
}

/**
 * Получить прогресс skill достижений пользователя
 */
export async function getSkillAchievementProgress(userId: string): Promise<{
  total: number;
  completed: number;
  inProgress: number;
  completionPct: number;
}> {
  const userAchievements = await getUserSkillAchievements(userId);
  const visibleCatalog = SKILL_ACHIEVEMENT_CATALOG.filter(a => !a.hidden);

  const completed = userAchievements.filter(a => a.completed).length;
  const inProgress = userAchievements.filter(a => !a.completed && a.skillScore > 0).length;

  return {
    total: visibleCatalog.length,
    completed,
    inProgress,
    completionPct: visibleCatalog.length > 0
      ? Math.round((completed / visibleCatalog.length) * 100)
      : 0
  };
}

/**
 * Получить skill достижения по навыку
 */
export async function getSkillAchievementsBySkill(
  userId: string,
  skillId: SkillProfileId
): Promise<{
  available: SkillAchievement[];
  completed: UserSkillAchievement[];
  inProgress: UserSkillAchievement[];
}> {
  const allUserAchievements = await getUserSkillAchievements(userId);
  const skillAchievements = SKILL_ACHIEVEMENT_CATALOG.filter(a => a.skillId === skillId);

  const completed: UserSkillAchievement[] = [];
  const inProgress: UserSkillAchievement[] = [];
  const completedIds = new Set<string>();

  for (const userAchievement of allUserAchievements) {
    const achievement = skillAchievements.find(a => a.id === userAchievement.skillAchievementId);
    if (!achievement) continue;

    if (userAchievement.completed) {
      completed.push(userAchievement);
      completedIds.add(userAchievement.skillAchievementId);
    } else {
      inProgress.push(userAchievement);
    }
  }

  const available = skillAchievements.filter(a => !completedIds.has(a.id));

  return {
    available,
    completed,
    inProgress
  };
}

/**
 * Получить все завершённые skill достижения пользователя
 */
export async function getCompletedSkillAchievements(userId: string): Promise<UserSkillAchievement[]> {
  return db.userSkillAchievements
    .where("userId")
    .equals(userId)
    .filter((achievement) => achievement.completed)
    .sortBy("completedAt");
}

/**
 * Получить недавно полученные skill достижения
 */
export async function getRecentSkillAchievements(
  userId: string,
  limit: number = 5
): Promise<UserSkillAchievement[]> {
  const completed = await getCompletedSkillAchievements(userId);
  return completed
    .sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, limit);
}

export const skillAchievementRepository = {
  getUserSkillAchievements,
  getUserSkillAchievement,
  checkSkillAchievements,
  getAvailableSkillAchievements,
  getSkillAchievementProgress,
  getSkillAchievementsBySkill,
  getCompletedSkillAchievements,
  getRecentSkillAchievements
};
