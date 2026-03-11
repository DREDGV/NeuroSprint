import {
  getAchievementById,
  getActiveAchievementModuleIds,
  getVisibleAchievements
} from "./achievementList";
import { getLevelProgress } from "./xpCalculator";
import type {
  Achievement,
  AchievementConditionType,
  Session,
  TrainingModuleId,
  UserAchievement,
  UserLevel
} from "../../types/domain";

type GoalKind = "level" | "achievement";

export interface ProgressGoal {
  kind: GoalKind;
  id: string;
  icon: string;
  title: string;
  progressPct: number;
  currentValue: number;
  targetValue: number;
  remaining: number;
  progressLabel: string;
  summary: string;
  remainingLabel: string;
}

export interface ProgressGoalSummary {
  levelGoal: ProgressGoal;
  achievementGoal: ProgressGoal | null;
  primaryGoal: ProgressGoal;
  secondaryGoal: ProgressGoal | null;
}

export interface ProgressGoalContext {
  level: UserLevel;
  achievements: UserAchievement[];
  sessions?: Session[];
  totalSessions?: number;
  sessionsToday?: number;
  streakDays?: number;
  moduleSessions?: Partial<Record<TrainingModuleId, number>>;
  completedModules?: Iterable<TrainingModuleId>;
}

function pluralize(value: number, forms: [string, string, string]): string {
  const abs = Math.abs(value) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) {
    return forms[2];
  }
  if (last > 1 && last < 5) {
    return forms[1];
  }
  if (last === 1) {
    return forms[0];
  }
  return forms[2];
}

function clampProgress(currentValue: number, targetValue: number): number {
  if (targetValue <= 0) {
    return 100;
  }
  return Math.max(0, Math.min(100, Math.round((currentValue / targetValue) * 100)));
}

function buildModuleSessionMap(
  sessions: Session[] | undefined,
  override: Partial<Record<TrainingModuleId, number>> | undefined
): Partial<Record<TrainingModuleId, number>> {
  if (override) {
    return override;
  }

  if (!sessions) {
    return {};
  }

  return sessions.reduce<Partial<Record<TrainingModuleId, number>>>((acc, session) => {
    acc[session.moduleId] = (acc[session.moduleId] ?? 0) + 1;
    return acc;
  }, {});
}

function getFallbackCurrentValue(
  targetValue: number,
  progress: number,
  completed: boolean
): number {
  if (completed) {
    return targetValue;
  }

  const estimated = Math.round((Math.max(0, progress) / 100) * targetValue);
  return Math.min(targetValue - 1, Math.max(0, estimated));
}

function resolveAchievementCurrentValue(
  achievement: Achievement,
  progress: UserAchievement | undefined,
  context: ProgressGoalContext,
  moduleSessionMap: Partial<Record<TrainingModuleId, number>>,
  completedModules: Set<TrainingModuleId>
): number {
  const targetValue = achievement.condition.value;

  switch (achievement.condition.type) {
    case "streak_days":
      return context.streakDays ?? getFallbackCurrentValue(targetValue, progress?.progress ?? 0, Boolean(progress?.completed));
    case "sessions_total":
      return context.totalSessions ?? getFallbackCurrentValue(targetValue, progress?.progress ?? 0, Boolean(progress?.completed));
    case "sessions_today":
    case "perfect_day":
      return context.sessionsToday ?? getFallbackCurrentValue(targetValue, progress?.progress ?? 0, Boolean(progress?.completed));
    case "module_sessions":
      if (achievement.condition.moduleId) {
        return moduleSessionMap[achievement.condition.moduleId] ?? getFallbackCurrentValue(targetValue, progress?.progress ?? 0, Boolean(progress?.completed));
      }
      return getFallbackCurrentValue(targetValue, progress?.progress ?? 0, Boolean(progress?.completed));
    case "all_modules":
      return completedModules.size > 0
        ? completedModules.size
        : getFallbackCurrentValue(targetValue, progress?.progress ?? 0, Boolean(progress?.completed));
    case "level_reached":
      return context.level.level;
    default:
      return getFallbackCurrentValue(targetValue, progress?.progress ?? 0, Boolean(progress?.completed));
  }
}

function formatAchievementRemainingLabel(
  type: AchievementConditionType,
  remaining: number
): string {
  switch (type) {
    case "streak_days":
      return `${remaining} ${pluralize(remaining, ["день", "дня", "дней"])}`;
    case "sessions_total":
    case "module_sessions":
      return `${remaining} ${pluralize(remaining, ["сессия", "сессии", "сессий"])}`;
    case "sessions_today":
    case "perfect_day":
      return `${remaining} ${pluralize(remaining, ["сессия", "сессии", "сессий"])} сегодня`;
    case "all_modules":
      return `${remaining} ${pluralize(remaining, ["модуль", "модуля", "модулей"])}`;
    case "level_reached":
      return `${remaining} ${pluralize(remaining, ["уровень", "уровня", "уровней"])}`;
    default:
      return `${remaining}`;
  }
}

function buildLevelGoal(level: UserLevel): ProgressGoal {
  const nextLevel = level.level + 1;
  const remaining = Math.max(0, level.xpToNextLevel - level.currentXP);

  return {
    kind: "level",
    id: `level:${nextLevel}`,
    icon: "★",
    title: `Уровень ${nextLevel}`,
    progressPct: getLevelProgress(level),
    currentValue: level.currentXP,
    targetValue: level.xpToNextLevel,
    remaining,
    progressLabel: `${level.currentXP}/${level.xpToNextLevel} XP`,
    summary: `До уровня ${nextLevel} осталось ${remaining} XP`,
    remainingLabel: `${remaining} XP`
  };
}

function buildAchievementGoal(
  achievement: Achievement,
  progress: UserAchievement | undefined,
  context: ProgressGoalContext,
  moduleSessionMap: Partial<Record<TrainingModuleId, number>>,
  completedModules: Set<TrainingModuleId>
): ProgressGoal {
  const targetValue = achievement.condition.value;
  const currentValue = Math.min(
    targetValue,
    resolveAchievementCurrentValue(
      achievement,
      progress,
      context,
      moduleSessionMap,
      completedModules
    )
  );
  const remaining = Math.max(0, targetValue - currentValue);

  return {
    kind: "achievement",
    id: achievement.id,
    icon: achievement.icon,
    title: achievement.title,
    progressPct: clampProgress(currentValue, targetValue),
    currentValue,
    targetValue,
    remaining,
    progressLabel: `${currentValue}/${targetValue}`,
    summary: `До "${achievement.title}" осталось ${formatAchievementRemainingLabel(
      achievement.condition.type,
      remaining
    )}`,
    remainingLabel: formatAchievementRemainingLabel(achievement.condition.type, remaining)
  };
}

export function buildProgressGoalSummary(
  context: ProgressGoalContext
): ProgressGoalSummary {
  const levelGoal = buildLevelGoal(context.level);
  const progressMap = new Map(
    context.achievements.map((achievement) => [achievement.achievementId, achievement])
  );
  const moduleSessionMap = buildModuleSessionMap(context.sessions, context.moduleSessions);
  const completedModules = context.completedModules
    ? new Set(context.completedModules)
    : new Set((context.sessions ?? []).map((session) => session.moduleId));
  const activeModules = new Set(getActiveAchievementModuleIds());

  const achievementCandidates = getVisibleAchievements()
    .filter((achievement) => achievement.condition.type !== "level_reached")
    .filter((achievement) => !progressMap.get(achievement.id)?.completed)
    .map((achievement) => {
      const progress = progressMap.get(achievement.id);
      const goal = buildAchievementGoal(
        achievement,
        progress,
        context,
        moduleSessionMap,
        new Set([...completedModules].filter((moduleId) => activeModules.has(moduleId)))
      );

      return {
        achievement,
        goal
      };
    })
    .sort((left, right) => {
      if (right.goal.progressPct !== left.goal.progressPct) {
        return right.goal.progressPct - left.goal.progressPct;
      }
      if (left.goal.remaining !== right.goal.remaining) {
        return left.goal.remaining - right.goal.remaining;
      }
      return left.achievement.order - right.achievement.order;
    });

  const achievementGoal = achievementCandidates[0]?.goal ?? null;

  if (!achievementGoal) {
    return {
      levelGoal,
      achievementGoal: null,
      primaryGoal: levelGoal,
      secondaryGoal: null
    };
  }

  const primaryGoal =
    achievementGoal.progressPct > levelGoal.progressPct ||
    (achievementGoal.progressPct === levelGoal.progressPct &&
      achievementGoal.remaining < levelGoal.remaining)
      ? achievementGoal
      : levelGoal;

  return {
    levelGoal,
    achievementGoal,
    primaryGoal,
    secondaryGoal: primaryGoal.id === levelGoal.id ? achievementGoal : levelGoal
  };
}

export function formatProgressGoalLine(summary: ProgressGoalSummary): string {
  if (!summary.secondaryGoal) {
    return `Следующая цель: ${summary.primaryGoal.summary}.`;
  }

  return `Следующая цель: ${summary.primaryGoal.summary}. Параллельно: ${summary.secondaryGoal.summary}.`;
}

export function describeProgressGoal(goal: ProgressGoal): string {
  return `${goal.icon} ${goal.title}`;
}

export function resolveAchievementTitle(achievementId: string): string {
  return getAchievementById(achievementId)?.title ?? achievementId;
}
