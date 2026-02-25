import type { DailyProgressSummary } from "../../types/domain";

export interface StreakBadge {
  id: string;
  title: string;
  subtitle: string;
  minDays: number;
  icon: string;
}

export interface MiniGoal {
  id: string;
  title: string;
  description: string;
  progressLabel: string;
  completed: boolean;
}

const STREAK_BADGES: ReadonlyArray<StreakBadge> = [
  {
    id: "start",
    title: "Старт",
    subtitle: "Начинаем ритм тренировок",
    minDays: 0,
    icon: "S1"
  },
  {
    id: "steady_3",
    title: "Ритм 3 дня",
    subtitle: "Формируется привычка",
    minDays: 3,
    icon: "S3"
  },
  {
    id: "steady_7",
    title: "Ритм 7 дней",
    subtitle: "Недельная серия",
    minDays: 7,
    icon: "S7"
  },
  {
    id: "steady_14",
    title: "Ритм 14 дней",
    subtitle: "Стабильная выносливость",
    minDays: 14,
    icon: "S14"
  },
  {
    id: "steady_30",
    title: "Ритм 30 дней",
    subtitle: "Сильная учебная дисциплина",
    minDays: 30,
    icon: "S30"
  }
];

function clampSessionsGoal(goal: number): number {
  if (!Number.isFinite(goal)) {
    return 1;
  }
  return Math.max(1, Math.round(goal));
}

export function resolveStreakBadge(streakDays: number): StreakBadge {
  let current = STREAK_BADGES[0];
  for (const badge of STREAK_BADGES) {
    if (streakDays >= badge.minDays) {
      current = badge;
    }
  }
  return current;
}

export function resolveNextStreakBadge(streakDays: number): StreakBadge | null {
  return STREAK_BADGES.find((badge) => badge.minDays > streakDays) ?? null;
}

export function buildDailyMiniGoals(input: {
  streakDays: number;
  dailySummary: DailyProgressSummary | null;
  dailyGoalSessions: number;
}): MiniGoal[] {
  const sessionsToday = input.dailySummary?.sessionsTotal ?? 0;
  const sessionsGoal = clampSessionsGoal(input.dailyGoalSessions);
  const completedSessions = sessionsToday >= sessionsGoal;
  const nextBadge = resolveNextStreakBadge(input.streakDays);
  const miniGoals: MiniGoal[] = [
    {
      id: "daily_sessions",
      title: "Дневной объём",
      description: "Сделайте короткую серию тренировок в спокойном темпе.",
      progressLabel: `${Math.min(sessionsToday, sessionsGoal)} / ${sessionsGoal}`,
      completed: completedSessions
    },
    {
      id: "streak_keep",
      title: "Сохранить серию",
      description:
        input.streakDays > 0
          ? `Сделайте хотя бы 1 сессию, чтобы сохранить серию ${input.streakDays} дн.`
          : "Сделайте 1 сессию, чтобы начать серию дней.",
      progressLabel: sessionsToday > 0 ? "выполнено" : "0 / 1",
      completed: sessionsToday > 0
    }
  ];

  if (nextBadge) {
    miniGoals.push({
      id: "next_badge",
      title: `Бейдж: ${nextBadge.title}`,
      description: `До следующего бейджа осталось ${nextBadge.minDays - input.streakDays} дн.`,
      progressLabel: `${Math.max(0, input.streakDays)} / ${nextBadge.minDays}`,
      completed: false
    });
  }

  return miniGoals;
}
