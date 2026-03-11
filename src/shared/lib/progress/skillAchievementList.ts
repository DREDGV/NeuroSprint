import type { SkillAchievement, SkillProfileId } from "../../types/domain";

/**
 * Каталог достижений навыков (Phase 3C).
 * По два достижения на каждый навык: за 50 и 80 очков.
 */
export const SKILL_ACHIEVEMENT_CATALOG: SkillAchievement[] = [
  {
    id: "skill_attention_50",
    skillId: "attention",
    threshold: 50,
    title: "Мастер внимания I",
    description: "Наберите 50 очков по навыку внимания.",
    icon: "🎯",
    category: "skill_mastery",
    order: 1,
    hidden: false
  },
  {
    id: "skill_attention_80",
    skillId: "attention",
    threshold: 80,
    title: "Мастер внимания II",
    description: "Наберите 80 очков по навыку внимания.",
    icon: "👁️",
    category: "skill_mastery",
    order: 2,
    hidden: false
  },
  {
    id: "skill_memory_50",
    skillId: "memory",
    threshold: 50,
    title: "Мастер памяти I",
    description: "Наберите 50 очков по навыку памяти.",
    icon: "🧠",
    category: "skill_mastery",
    order: 3,
    hidden: false
  },
  {
    id: "skill_memory_80",
    skillId: "memory",
    threshold: 80,
    title: "Мастер памяти II",
    description: "Наберите 80 очков по навыку памяти.",
    icon: "💡",
    category: "skill_mastery",
    order: 4,
    hidden: false
  },
  {
    id: "skill_reaction_50",
    skillId: "reaction",
    threshold: 50,
    title: "Мастер скорости I",
    description: "Наберите 50 очков по скорости реакции.",
    icon: "⚡",
    category: "skill_mastery",
    order: 5,
    hidden: false
  },
  {
    id: "skill_reaction_80",
    skillId: "reaction",
    threshold: 80,
    title: "Мастер скорости II",
    description: "Наберите 80 очков по скорости реакции.",
    icon: "🚀",
    category: "skill_mastery",
    order: 6,
    hidden: false
  },
  {
    id: "skill_math_50",
    skillId: "math",
    threshold: 50,
    title: "Мастер счёта I",
    description: "Наберите 50 очков по навыку счёта.",
    icon: "🧮",
    category: "skill_mastery",
    order: 7,
    hidden: false
  },
  {
    id: "skill_math_80",
    skillId: "math",
    threshold: 80,
    title: "Мастер счёта II",
    description: "Наберите 80 очков по навыку счёта.",
    icon: "📐",
    category: "skill_mastery",
    order: 8,
    hidden: false
  },
  {
    id: "skill_logic_50",
    skillId: "logic",
    threshold: 50,
    title: "Мастер логики I",
    description: "Наберите 50 очков по логическому мышлению.",
    icon: "🎲",
    category: "skill_mastery",
    order: 9,
    hidden: false
  },
  {
    id: "skill_logic_80",
    skillId: "logic",
    threshold: 80,
    title: "Мастер логики II",
    description: "Наберите 80 очков по логическому мышлению.",
    icon: "🏆",
    category: "skill_mastery",
    order: 10,
    hidden: false
  }
];

export function getSkillAchievementById(id: string): SkillAchievement | undefined {
  return SKILL_ACHIEVEMENT_CATALOG.find((achievement) => achievement.id === id);
}

export function getSkillAchievementsBySkillId(skillId: SkillProfileId): SkillAchievement[] {
  return SKILL_ACHIEVEMENT_CATALOG
    .filter((achievement) => achievement.skillId === skillId)
    .sort((a, b) => a.order - b.order);
}

export function getSkillAchievementsByThreshold(threshold: 50 | 80): SkillAchievement[] {
  return SKILL_ACHIEVEMENT_CATALOG.filter((achievement) => achievement.threshold === threshold);
}

export function getSkillAchievementRewardXP(achievement: SkillAchievement): number {
  return achievement.threshold === 50 ? 35 : 50;
}

export function getVisibleSkillAchievements(): SkillAchievement[] {
  return SKILL_ACHIEVEMENT_CATALOG.filter((achievement) => !achievement.hidden);
}