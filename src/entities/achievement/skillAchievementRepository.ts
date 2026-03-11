import { db } from "../../db/database";
import { createId } from "../../shared/lib/id";
import { SKILL_ACHIEVEMENT_CATALOG } from "../../shared/lib/progress/skillAchievementList";
import type {
  UserSkillAchievement,
  SkillAchievement,
  SkillProfileId
} from "../../shared/types/domain";

/**
 * РџРѕР»СѓС‡РёС‚СЊ РІСЃРµ skill РґРѕСЃС‚РёР¶РµРЅРёСЏ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
 */
export async function getUserSkillAchievements(userId: string): Promise<UserSkillAchievement[]> {
  return db.userSkillAchievements
    .where("userId")
    .equals(userId)
    .sortBy("createdAt");
}

/**
 * РџРѕР»СѓС‡РёС‚СЊ РєРѕРЅРєСЂРµС‚РЅРѕРµ skill РґРѕСЃС‚РёР¶РµРЅРёРµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
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
 * РЎРѕР·РґР°С‚СЊ РёР»Рё РѕР±РЅРѕРІРёС‚СЊ skill РґРѕСЃС‚РёР¶РµРЅРёРµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
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
 * РџСЂРѕРІРµСЂРёС‚СЊ Рё РѕР±РЅРѕРІРёС‚СЊ РІСЃРµ skill РґРѕСЃС‚РёР¶РµРЅРёСЏ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РЅР° РѕСЃРЅРѕРІРµ РµРіРѕ РЅР°РІС‹РєРѕРІ
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
 * РџРѕР»СѓС‡РёС‚СЊ РґРѕСЃС‚СѓРїРЅС‹Рµ skill РґРѕСЃС‚РёР¶РµРЅРёСЏ (РєРѕС‚РѕСЂС‹Рµ РµС‰С‘ РЅРµ РїРѕР»СѓС‡РµРЅС‹)
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
 * РџРѕР»СѓС‡РёС‚СЊ РїСЂРѕРіСЂРµСЃСЃ skill РґРѕСЃС‚РёР¶РµРЅРёР№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
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
 * РџРѕР»СѓС‡РёС‚СЊ skill РґРѕСЃС‚РёР¶РµРЅРёСЏ РїРѕ РЅР°РІС‹РєСѓ
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
 * РџРѕР»СѓС‡РёС‚СЊ РІСЃРµ Р·Р°РІРµСЂС€С‘РЅРЅС‹Рµ skill РґРѕСЃС‚РёР¶РµРЅРёСЏ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
 */
export async function getCompletedSkillAchievements(userId: string): Promise<UserSkillAchievement[]> {
  return db.userSkillAchievements
    .where("userId")
    .equals(userId)
    .filter((achievement) => achievement.completed)
    .sortBy("completedAt");
}

/**
 * РџРѕР»СѓС‡РёС‚СЊ РЅРµРґР°РІРЅРѕ РїРѕР»СѓС‡РµРЅРЅС‹Рµ skill РґРѕСЃС‚РёР¶РµРЅРёСЏ
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
