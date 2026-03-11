import { db } from "../../db/database";
import { toLocalDateKey } from "../../shared/lib/date/date";
import { createId } from "../../shared/lib/id";
import { getSettings } from "../../shared/lib/settings/settings";
import { moduleIdByModeId } from "../../shared/lib/training/modeMapping";
import type {
  ComparePeriod,
  DailyTraining,
  DailyTrainingCompletionSummary,
  DailyTrainingHeatmapCell,
  DailyTrainingHistoryItem,
  DailyTrainingProgress,
  DailyTrainingSessionLink,
  DailyTrainingStreakSummary,
  DailyTrainingTrendPoint,
  Session,
  TrainingModuleId,
  TrainingModeId
} from "../../shared/types/domain";

function addDays(localDate: string, days: number): string {
  const [year, month, day] = localDate
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  const value = new Date(year, (month || 1) - 1, day || 1);
  value.setDate(value.getDate() + days);
  return toLocalDateKey(value);
}

function dateDiffDays(leftLocalDate: string, rightLocalDate: string): number {
  const [leftYear, leftMonth, leftDay] = leftLocalDate
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  const [rightYear, rightMonth, rightDay] = rightLocalDate
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  const leftDate = new Date(leftYear, (leftMonth || 1) - 1, leftDay || 1);
  const rightDate = new Date(rightYear, (rightMonth || 1) - 1, rightDay || 1);
  const diffMs = Math.abs(leftDate.getTime() - rightDate.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function toDayNumber(localDate: string): number {
  const [year, month, day] = localDate
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return 0;
  }
  return year * 10_000 + month * 100 + day;
}

function resolvePeriodStartLocalDate(period: ComparePeriod): string | null {
  if (period === "all") {
    return null;
  }
  const safePeriod = Number.isFinite(period) && period > 0 ? Math.round(period) : 30;
  const from = new Date();
  from.setDate(from.getDate() - safePeriod + 1);
  return toLocalDateKey(from);
}

async function listTrainingsForPeriod(
  userId: string,
  period: ComparePeriod
): Promise<DailyTraining[]> {
  const fromLocalDate = resolvePeriodStartLocalDate(period);
  if (!fromLocalDate) {
    return db.dailyTrainings.where("userId").equals(userId).sortBy("localDate");
  }
  return db.dailyTrainings
    .where("[userId+localDate]")
    .between([userId, fromLocalDate], [userId, "9999-12-31"])
    .toArray();
}

function buildTrainingDraft(
  userId: string,
  localDate: string,
  goalSessions: number
): DailyTraining {
  const now = new Date().toISOString();
  return {
    id: `${userId}:${localDate}`,
    userId,
    localDate,
    goalSessions,
    completedSessions: 0,
    status: "pending",
    completedAt: null,
    createdAt: now,
    updatedAt: now
  };
}

function buildProgress(
  training: DailyTraining,
  sessions: DailyTrainingSessionLink[]
): DailyTrainingProgress {
  // Используем актуальное количество сессий из sessions массива
  const actualCompletedSessions = sessions.length;
  const completed = training.status === "completed" || actualCompletedSessions >= training.goalSessions;
  const progressPercent = training.goalSessions > 0
    ? Math.min(100, Math.round((actualCompletedSessions / training.goalSessions) * 100))
    : 0;
  const remainingSessions = Math.max(0, training.goalSessions - actualCompletedSessions);

  // Определяем рекомендуемый режим для продолжения
  const lastSession = sessions.length > 0
    ? sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    : null;

  let launchPath = "/training";
  if (lastSession) {
    launchPath = `/training?mode=${lastSession.modeId}`;
  }

  return {
    training: {
      ...training,
      completedSessions: actualCompletedSessions
    },
    sessions,
    completed,
    progressPercent,
    remainingSessions,
    launchPath
  };
}

async function markCompletedIfNeeded(
  training: DailyTraining
): Promise<DailyTraining> {
  if (training.completedSessions < training.goalSessions || training.status === "completed") {
    return training;
  }

  const completedAt = training.completedAt ?? new Date().toISOString();
  await db.dailyTrainings.update(training.id, {
    status: "completed",
    completedAt,
    updatedAt: completedAt
  });

  return {
    ...training,
    status: "completed",
    completedAt,
    updatedAt: completedAt
  };
}

async function synchronizeSessions(training: DailyTraining): Promise<DailyTrainingSessionLink[]> {
  // Получаем существующие связи
  const existingLinks = await db.dailyTrainingSessions
    .where("dailyTrainingId")
    .equals(training.id)
    .toArray();
  const existingSessionIds = new Set(existingLinks.map((link) => link.sessionId));

  // Получаем сессии пользователя за этот день
  const sessions = await db.sessions
    .where("[userId+localDate]")
    .equals([training.userId, training.localDate])
    .toArray();

  // Находим новые сессии для добавления
  const missingLinks: DailyTrainingSessionLink[] = sessions
    .filter((session) => !existingSessionIds.has(session.id))
    .map((session) => ({
      id: createId(),
      dailyTrainingId: training.id,
      userId: training.userId,
      sessionId: session.id,
      moduleId: session.moduleId,
      modeId: session.modeId,
      score: session.score,
      durationMs: session.durationMs,
      createdAt: session.timestamp
    }));

  // Добавляем новые связи
  if (missingLinks.length > 0) {
    await db.dailyTrainingSessions.bulkAdd(missingLinks);
  }

  // Обновляем completedSessions
  const totalSessions = existingLinks.length + missingLinks.length;
  if (totalSessions !== training.completedSessions) {
    await db.dailyTrainings.update(training.id, {
      completedSessions: totalSessions,
      updatedAt: new Date().toISOString()
    });

    training.completedSessions = totalSessions;
  }

  return [...existingLinks, ...missingLinks];
}

export function calculateStreak(localDates: string[]): number {
  if (localDates.length === 0) {
    return 0;
  }

  // Сортируем по убыванию (от новых к старым)
  const desc = [...localDates].sort((a, b) => b.localeCompare(a));
  let streak = 0;
  let cursor = new Date();
  cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());

  for (const dateKey of desc) {
    const expected = toLocalDateKey(cursor);
    if (dateKey !== expected) {
      // Проверяем, не вчерашний ли это день (для начала серии)
      const yesterday = new Date(cursor);
      yesterday.setDate(yesterday.getDate() - 1);
      if (dateKey === toLocalDateKey(yesterday) && streak === 0) {
        streak = 1;
        cursor = yesterday;
        continue;
      }
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function calculateBestStreak(localDates: string[]): number {
  if (localDates.length === 0) {
    return 0;
  }

  // Сортируем по возрастанию
  const asc = [...localDates].sort((a, b) => a.localeCompare(b));
  let bestStreak = 0;
  let runningStreak = 0;
  let previousDate: string | null = null;

  for (const dateKey of asc) {
    if (!previousDate) {
      runningStreak = 1;
    } else {
      const diff = dateDiffDays(dateKey, previousDate);
      if (diff === 1) {
        runningStreak += 1;
      } else if (diff > 1) {
        runningStreak = 1;
      }
      // Если diff === 0, это дубликат, не увеличиваем
    }
    previousDate = dateKey;
    bestStreak = Math.max(bestStreak, runningStreak);
  }

  return bestStreak;
}

export function computeHeatmapIntensity(sessionsCount: number, completed: boolean): 0 | 1 | 2 | 3 | 4 {
  if (!completed || sessionsCount === 0) {
    return 0;
  }
  if (sessionsCount >= 5) {
    return 4;
  }
  if (sessionsCount >= 3) {
    return 3;
  }
  if (sessionsCount >= 2) {
    return 2;
  }
  return 1;
}

export const dailyTrainingRepository = {
  /**
   * Получить или создать прогресс на сегодня
   */
  async getOrCreateForToday(
    userId: string,
    localDate = toLocalDateKey(new Date())
  ): Promise<DailyTrainingProgress> {
    const settings = getSettings();
    const goalSessions = settings.dailyGoalSessions || 3;

    let training =
      (await db.dailyTrainings.where("[userId+localDate]").equals([userId, localDate]).first()) ??
      null;

    if (!training) {
      training = buildTrainingDraft(userId, localDate, goalSessions);
      await db.dailyTrainings.put(training);
    }

    // Синхронизируем сессии
    const sessions = await synchronizeSessions(training);

    // Получаем актуальное состояние после синхронизации
    const updatedTraining = await db.dailyTrainings.get(training.id);
    if (!updatedTraining) {
      throw new Error("Daily training not found after sync");
    }

    // Проверяем completion
    const finalizedTraining = await markCompletedIfNeeded(updatedTraining);

    return buildProgress(finalizedTraining, sessions);
  },

  /**
   * Зарегистрировать сессию в daily training
   * Вызывается автоматически при сохранении сессии
   */
  async registerSession(session: Session): Promise<void> {
    const localDate = session.localDate || toLocalDateKey(session.timestamp);

    await db.transaction("rw", db.dailyTrainings, db.dailyTrainingSessions, async () => {
      // Получаем или создаём DailyTraining
      let training =
        (await db.dailyTrainings.where("[userId+localDate]").equals([session.userId, localDate]).first()) ??
        null;

      if (!training) {
        const settings = getSettings();
        const goalSessions = settings.dailyGoalSessions || 3;
        training = buildTrainingDraft(session.userId, localDate, goalSessions);
        await db.dailyTrainings.put(training);
      }

      // Проверяем, есть ли уже связь с этой сессией
      const existingLink = await db.dailyTrainingSessions
        .where("[dailyTrainingId+sessionId]")
        .equals([training.id, session.id])
        .first();

      if (existingLink) {
        // Сессия уже зарегистрирована, просто обновим статус
        await markCompletedIfNeeded(training);
        return;
      }

      // Создаём новую связь
      const newLink: DailyTrainingSessionLink = {
        id: createId(),
        dailyTrainingId: training.id,
        userId: session.userId,
        sessionId: session.id,
        moduleId: session.moduleId,
        modeId: session.modeId,
        score: session.score,
        durationMs: session.durationMs,
        createdAt: session.timestamp
      };

      await db.dailyTrainingSessions.put(newLink);

      // Обновляем completedSessions
      const sessionsCount = await db.dailyTrainingSessions
        .where("dailyTrainingId")
        .equals(training.id)
        .count();

      await db.dailyTrainings.update(training.id, {
        completedSessions: sessionsCount,
        updatedAt: new Date().toISOString()
      });

      // Проверяем completion
      const updatedTraining = await db.dailyTrainings.get(training.id);
      if (updatedTraining) {
        await markCompletedIfNeeded(updatedTraining);
      }
    });
  },

  /**
   * Получить сводку за период
   */
  async getCompletionSummary(
    userId: string,
    period: ComparePeriod
  ): Promise<DailyTrainingCompletionSummary> {
    const trainings = await listTrainingsForPeriod(userId, period);

    const totalDays = trainings.length;
    const completedDays = trainings.filter((t) => t.status === "completed").length;
    const pendingDays = totalDays - completedDays;
    const completionRatePct = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

    // Считаем总 сессий
    let totalSessions = 0;
    for (const training of trainings) {
      const count = await db.dailyTrainingSessions
        .where("dailyTrainingId")
        .equals(training.id)
        .count();
      totalSessions += count;
    }

    const avgSessionsPerDay = totalDays > 0 ? totalSessions / totalDays : 0;

    return {
      period,
      totalDays,
      completedDays,
      pendingDays,
      completionRatePct,
      totalSessions,
      avgSessionsPerDay
    };
  },

  /**
   * История дней для тренда
   */
  async listHistory(
    userId: string,
    period: ComparePeriod,
    limit = 60
  ): Promise<DailyTrainingHistoryItem[]> {
    const trainings = await listTrainingsForPeriod(userId, period);
    const sorted = [...trainings].sort((a, b) => b.localDate.localeCompare(a.localDate));
    const sliced = sorted.slice(0, Math.max(1, Math.min(365, Math.round(limit))));

    const withDetails = await Promise.all(
      sliced.map(async (training) => {
        const links = await db.dailyTrainingSessions
          .where("dailyTrainingId")
          .equals(training.id)
          .toArray();

        const sessionsCount = links.length;
        const totalDurationMs = links.reduce((sum, link) => sum + link.durationMs, 0);
        const bestScore = links.length > 0 ? Math.max(...links.map((l) => l.score)) : 0;

        return {
          dailyTrainingId: training.id,
          localDate: training.localDate,
          goalSessions: training.goalSessions,
          completedSessions: training.completedSessions,
          status: training.status,
          completedAt: training.completedAt,
          sessionsCount,
          totalDurationMs,
          bestScore
        } satisfies DailyTrainingHistoryItem;
      })
    );

    return withDetails;
  },

  /**
   * Streak: сколько дней подряд цель достигнута
   */
  async getStreakSummary(
    userId: string,
    period: ComparePeriod
  ): Promise<DailyTrainingStreakSummary> {
    const history = await this.listHistory(userId, period, 365);
    const completedDates = history
      .filter((item) => item.status === "completed")
      .map((item) => item.localDate);

    const currentStreakDays = calculateStreak(completedDates);
    const bestStreakDays = calculateBestStreak(completedDates);
    const completedDays = completedDates.length;

    return {
      period,
      currentStreakDays,
      bestStreakDays,
      completedDays
    };
  },

  /**
   * Тренд completion по дням
   */
  async listCompletionTrend(
    userId: string,
    period: ComparePeriod,
    limit = 60
  ): Promise<DailyTrainingTrendPoint[]> {
    const history = await this.listHistory(userId, period, limit);

    return [...history]
      .sort((a, b) => a.localDate.localeCompare(b.localDate))
      .map((item) => ({
        localDate: item.localDate,
        completed: item.status === "completed",
        completedSessions: item.completedSessions,
        goalSessions: item.goalSessions,
        progressPct: item.goalSessions > 0
          ? Math.min(100, Math.round((item.completedSessions / item.goalSessions) * 100))
          : 0,
        sessionsCount: item.sessionsCount
      }));
  },

  /**
   * Heatmap данные для календаря
   */
  async getHeatmapData(
    userId: string,
    monthsBack = 6
  ): Promise<DailyTrainingHeatmapCell[]> {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (monthsBack * 30));

    const period: ComparePeriod = dateDiffDays(
      toLocalDateKey(today),
      toLocalDateKey(startDate)
    );

    const history = await this.listHistory(userId, period, 365);

    // Создаём map для быстрого доступа
    const historyMap = new Map(
      history.map((item) => [item.localDate, item])
    );

    // Генерируем все дни за период
    const cells: DailyTrainingHeatmapCell[] = [];
    const totalDays = dateDiffDays(toLocalDateKey(today), toLocalDateKey(startDate));

    for (let i = 0; i <= totalDays; i++) {
      const date = addDays(toLocalDateKey(startDate), i);
      const item = historyMap.get(date);

      if (item) {
        cells.push({
          localDate: date,
          completed: item.status === "completed",
          sessionsCount: item.sessionsCount,
          intensity: computeHeatmapIntensity(item.sessionsCount, item.status === "completed")
        });
      } else {
        cells.push({
          localDate: date,
          completed: false,
          sessionsCount: 0,
          intensity: 0
        });
      }
    }

    return cells;
  },

  /**
   * Получить сессии для конкретного дня
   */
  async getSessionsByDate(
    userId: string,
    localDate: string
  ): Promise<DailyTrainingSessionLink[]> {
    const training = await db.dailyTrainings
      .where("[userId+localDate]")
      .equals([userId, localDate])
      .first();

    if (!training) {
      return [];
    }

    return db.dailyTrainingSessions
      .where("dailyTrainingId")
      .equals(training.id)
      .sortBy("createdAt");
  },

  /**
   * Получить moduleId для режима (для launch path)
   */
  getModuleIdByModeId(modeId: TrainingModuleId | string): TrainingModuleId {
    return moduleIdByModeId(modeId as TrainingModeId);
  }
};
