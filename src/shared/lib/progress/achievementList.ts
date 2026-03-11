import { TRAINING_MODULES } from "../training/presets";
import type { Achievement, TrainingModuleId } from "../../types/domain";

const ACTIVE_MODULE_IDS = TRAINING_MODULES
  .filter((module) => module.status === "active")
  .map((module) => module.id);

/**
 * Каталог всех достижений игры.
 * 
 * Правила:
 * - id: уникальный идентификатор (snake_case)
 * - order: порядок отображения (меньше = выше)
 * - hidden: скрытые достижения не показываются пока не получены
 */
export const ACHIEVEMENT_CATALOG: Achievement[] = [
  // ============================================================================
  // Streak — Серии дней
  // ============================================================================
  {
    id: "streak_3",
    title: "Ритм 3 дня",
    description: "Пройдите 3 дня подряд без пропусков",
    icon: "🔥",
    category: "streak",
    condition: {
      type: "streak_days",
      value: 3
    },
    order: 1,
    hidden: false
  },
  {
    id: "streak_7",
    title: "Неделя",
    description: "Пройдите 7 дней подряд",
    icon: "📅",
    category: "streak",
    condition: {
      type: "streak_days",
      value: 7
    },
    order: 2,
    hidden: false
  },
  {
    id: "streak_14",
    title: "Две недели",
    description: "Пройдите 14 дней подряд",
    icon: "⚡",
    category: "streak",
    condition: {
      type: "streak_days",
      value: 14
    },
    order: 3,
    hidden: false
  },
  {
    id: "streak_30",
    title: "Месяц",
    description: "Пройдите 30 дней подряд",
    icon: "🏆",
    category: "streak",
    condition: {
      type: "streak_days",
      value: 30
    },
    order: 4,
    hidden: false
  },

  // ============================================================================
  // Sessions — Количество сессий
  // ============================================================================
  {
    id: "sessions_10",
    title: "Первые шаги",
    description: "Пройдите 10 сессий",
    icon: "👣",
    category: "sessions",
    condition: {
      type: "sessions_total",
      value: 10
    },
    order: 10,
    hidden: false
  },
  {
    id: "sessions_50",
    title: "Активный",
    description: "Пройдите 50 сессий",
    icon: "💪",
    category: "sessions",
    condition: {
      type: "sessions_total",
      value: 50
    },
    order: 11,
    hidden: false
  },
  {
    id: "sessions_100",
    title: "Ветеран",
    description: "Пройдите 100 сессий",
    icon: "🎖️",
    category: "sessions",
    condition: {
      type: "sessions_total",
      value: 100
    },
    order: 12,
    hidden: false
  },
  {
    id: "sessions_500",
    title: "Мастер",
    description: "Пройдите 500 сессий",
    icon: "👑",
    category: "sessions",
    condition: {
      type: "sessions_total",
      value: 500
    },
    order: 13,
    hidden: false
  },

  // ============================================================================
  // Daily — Дневные цели
  // ============================================================================
  {
    id: "perfect_day",
    title: "Идеальный день",
    description: "Выполните 5+ сессий за один день",
    icon: "✨",
    category: "daily",
    condition: {
      type: "perfect_day",
      value: 5
    },
    order: 20,
    hidden: false
  },
  {
    id: "daily_7",
    title: "Неделя целей",
    description: "Выполните дневную цель 7 дней",
    icon: "📊",
    category: "daily",
    condition: {
      type: "streak_days",
      value: 7
    },
    order: 21,
    hidden: false
  },

  // ============================================================================
  // Skill — Навыки/модули
  // ============================================================================
  {
    id: "skill_schulte_10",
    title: "Любитель Шульте",
    description: "Пройдите 10 сессий в Таблице Шульте",
    icon: "🔢",
    category: "skill",
    condition: {
      type: "module_sessions",
      value: 10,
      moduleId: "schulte"
    },
    order: 30,
    hidden: false
  },
  {
    id: "skill_sprint_math_10",
    title: "Скоростной счёт",
    description: "Пройдите 10 сессий в Sprint Math",
    icon: "🧮",
    category: "skill",
    condition: {
      type: "module_sessions",
      value: 10,
      moduleId: "sprint_math"
    },
    order: 31,
    hidden: false
  },
  {
    id: "skill_reaction_10",
    title: "Быстрая реакция",
    description: "Пройдите 10 сессий в Reaction",
    icon: "⚡",
    category: "skill",
    condition: {
      type: "module_sessions",
      value: 10,
      moduleId: "reaction"
    },
    order: 32,
    hidden: false
  },
  {
    id: "skill_nback_10",
    title: "Память в действии",
    description: "Пройдите 10 сессий в N-Back Lite",
    icon: "🧠",
    category: "skill",
    condition: {
      type: "module_sessions",
      value: 10,
      moduleId: "n_back"
    },
    order: 33,
    hidden: false
  },
  {
    id: "skill_memory_grid_10",
    title: "Запоминание",
    description: "Пройдите 10 сессий в Memory Grid",
    icon: "🔳",
    category: "skill",
    condition: {
      type: "module_sessions",
      value: 10,
      moduleId: "memory_grid"
    },
    order: 34,
    hidden: false
  },
  {
    id: "skill_spatial_memory_10",
    title: "Пространственная карта",
    description: "Пройдите 10 сессий в Spatial Memory",
    icon: "🧭",
    category: "skill",
    condition: {
      type: "module_sessions",
      value: 10,
      moduleId: "spatial_memory"
    },
    order: 35,
    hidden: false
  },
  {
    id: "skill_decision_rush_10",
    title: "Принятие решений",
    description: "Пройдите 10 сессий в Decision Rush",
    icon: "🎯",
    category: "skill",
    condition: {
      type: "module_sessions",
      value: 10,
      moduleId: "decision_rush"
    },
    order: 36,
    hidden: false
  },
  {
    id: "skill_memory_match_10",
    title: "Карта памяти",
    description: "Пройдите 10 сессий в Memory Match",
    icon: "🧩",
    category: "skill",
    condition: {
      type: "module_sessions",
      value: 10,
      moduleId: "memory_match"
    },
    order: 37,
    hidden: false
  },
  {
    id: "skill_pattern_recognition_10",
    title: "Узоры и логика",
    description: "Пройдите 10 сессий в Pattern Recognition",
    icon: "🔍",
    category: "skill",
    condition: {
      type: "module_sessions",
      value: 10,
      moduleId: "pattern_recognition"
    },
    order: 38,
    hidden: false
  },

  // ============================================================================
  // Special — Специальные
  // ============================================================================
  {
    id: "all_modules",
    title: "Универсал",
    description: "Пройдите хотя бы одну сессию во всех официальных модулях",
    icon: "🌟",
    category: "special",
    condition: {
      type: "all_modules",
      value: ACTIVE_MODULE_IDS.length
    },
    order: 50,
    hidden: false
  },
  {
    id: "level_5",
    title: "Опытный",
    description: "Достигните 5 уровня",
    icon: "⭐",
    category: "special",
    condition: {
      type: "level_reached",
      value: 5
    },
    order: 51,
    hidden: false
  },
  {
    id: "level_10",
    title: "Эксперт",
    description: "Достигните 10 уровня",
    icon: "🌟",
    category: "special",
    condition: {
      type: "level_reached",
      value: 10
    },
    order: 52,
    hidden: false
  },
  {
    id: "level_20",
    title: "Легенда",
    description: "Достигните 20 уровня",
    icon: "💫",
    category: "special",
    condition: {
      type: "level_reached",
      value: 20
    },
    order: 53,
    hidden: false
  }
];

/**
 * Получить достижение по ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENT_CATALOG.find(a => a.id === id);
}

/**
 * Получить все достижения категории
 */
export function getAchievementsByCategory(category: Achievement["category"]): Achievement[] {
  return ACHIEVEMENT_CATALOG
    .filter(a => a.category === category)
    .sort((a, b) => a.order - b.order);
}

/**
 * Получить все видимые достижения (не скрытые)
 */
export function getVisibleAchievements(): Achievement[] {
  return ACHIEVEMENT_CATALOG.filter(a => !a.hidden);
}

export function getActiveAchievementModuleIds(): TrainingModuleId[] {
  return [...ACTIVE_MODULE_IDS];
}

export function getAchievementRewardXP(achievement: Achievement): number {
  switch (achievement.category) {
    case "streak":
      return 20;
    case "sessions":
      return 18;
    case "daily":
      return 25;
    case "skill":
      return 30;
    case "special":
      return 40;
    default:
      return 20;
  }
}

/**
 * Конфигурация XP системы
 */
export const XP_CONFIG = {
  baseXPPerSession: 10,           // Базовое XP за сессию
  dailyCompleteBonus: 25,         // Бонус за completion дня
  streakBonusMultiplier: 0.1,     // +10% за каждый день streak
  maxStreakMultiplier: 2.0,       // Максимум 2x
  xpToNextLevelBase: 100,         // Уровень 1→2: 100 XP
  xpToNextLevelGrowth: 50         // Каждый следующий уровень +50 XP
};

/**
 * Рассчитать XP до следующего уровня
 */
export function xpToNextLevel(level: number): number {
  return XP_CONFIG.xpToNextLevelBase + (level - 1) * XP_CONFIG.xpToNextLevelGrowth;
}

/**
 * Рассчитать XP за сессию с учётом streak
 */
export function calculateSessionXP(streakDays: number = 0): number {
  const multiplier = Math.min(
    XP_CONFIG.maxStreakMultiplier,
    1 + (streakDays * XP_CONFIG.streakBonusMultiplier)
  );
  return Math.round(XP_CONFIG.baseXPPerSession * multiplier);
}
