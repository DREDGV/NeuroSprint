import Dexie from "dexie";
import { db } from "../../db/database";
import { toLocalDateKey } from "../../shared/lib/date/date";
import { DEFAULT_AUDIO_SETTINGS } from "../../shared/lib/audio/audioSettings";
import type {
  ClassicDailyPoint,
  ComparePeriod,
  DailyProgressSummary,
  GroupMetric,
  ModeRecommendation,
  ModeMetricSnapshot,
  Session,
  SprintMathDailyPoint,
  TimedDailyPoint,
  TrainingModeId
} from "../../shared/types/domain";

function byDateAsc<T extends { date: string }>(a: T, b: T): number {
  return a.date.localeCompare(b.date);
}

export function buildClassicDailyPoints(sessions: Session[]): ClassicDailyPoint[] {
  const grouped = new Map<string, Session[]>();
  for (const session of sessions) {
    if (session.mode !== "classic" && session.mode !== "reverse") {
      continue;
    }

    const bucket = grouped.get(session.localDate);
    if (bucket) {
      bucket.push(session);
    } else {
      grouped.set(session.localDate, [session]);
    }
  }

  const points: ClassicDailyPoint[] = [];
  for (const [date, values] of grouped.entries()) {
    const durations = values.map((entry) => entry.durationMs);
    const bestDurationMs = Math.min(...durations);
    const avgDurationMs =
      durations.reduce((acc, value) => acc + value, 0) / durations.length;
    points.push({
      date,
      bestDurationMs,
      avgDurationMs,
      count: values.length
    });
  }

  return points.sort(byDateAsc);
}

export function buildTimedDailyPoints(sessions: Session[]): TimedDailyPoint[] {
  const grouped = new Map<string, Session[]>();
  for (const session of sessions) {
    if (session.mode !== "timed") {
      continue;
    }

    const bucket = grouped.get(session.localDate);
    if (bucket) {
      bucket.push(session);
    } else {
      grouped.set(session.localDate, [session]);
    }
  }

  const points: TimedDailyPoint[] = [];
  for (const [date, values] of grouped.entries()) {
    let effectivePerMinuteSum = 0;
    let scoreSum = 0;

    for (const entry of values) {
      const effective = entry.effectiveCorrect ?? 0;
      const minutes = entry.durationMs > 0 ? entry.durationMs / 60_000 : 1;
      effectivePerMinuteSum += effective / minutes;
      scoreSum += entry.score;
    }

    points.push({
      date,
      effectivePerMinute: effectivePerMinuteSum / values.length,
      avgScore: scoreSum / values.length,
      count: values.length
    });
  }

  return points.sort(byDateAsc);
}

export function buildSprintMathDailyPoints(sessions: Session[]): SprintMathDailyPoint[] {
  const grouped = new Map<string, Session[]>();
  for (const session of sessions) {
    if (session.mode !== "sprint_math") {
      continue;
    }

    const bucket = grouped.get(session.localDate);
    if (bucket) {
      bucket.push(session);
    } else {
      grouped.set(session.localDate, [session]);
    }
  }

  const points: SprintMathDailyPoint[] = [];
  for (const [date, values] of grouped.entries()) {
    const throughput =
      values.reduce((sum, entry) => sum + entry.speed, 0) / values.length;
    const accuracy =
      values.reduce((sum, entry) => sum + entry.accuracy, 0) / values.length;
    const avgScore =
      values.reduce((sum, entry) => sum + entry.score, 0) / values.length;

    points.push({
      date,
      throughput,
      accuracy,
      avgScore,
      count: values.length
    });
  }

  return points.sort(byDateAsc);
}

export function buildDailyProgressSummary(
  sessions: Session[],
  date: string
): DailyProgressSummary {
  const dailySessions = sessions.filter((entry) => entry.localDate === date);
  const classicSessions = dailySessions.filter((entry) => entry.modeId === "classic_plus");
  const timedSessions = dailySessions.filter((entry) => entry.modeId === "timed_plus");
  const reverseSessions = dailySessions.filter((entry) => entry.modeId === "reverse");

  const bestClassicDurationMs = classicSessions.length
    ? Math.min(...classicSessions.map((entry) => entry.durationMs))
    : null;

  const bestTimedScore = timedSessions.length
    ? Math.max(...timedSessions.map((entry) => entry.score))
    : null;

  const bestReverseDurationMs = reverseSessions.length
    ? Math.min(...reverseSessions.map((entry) => entry.durationMs))
    : null;

  const avgAccuracy = dailySessions.length
    ? dailySessions.reduce((sum, entry) => sum + entry.accuracy, 0) /
      dailySessions.length
    : null;

  return {
    date,
    sessionsTotal: dailySessions.length,
    classicCount: classicSessions.length,
    timedCount: timedSessions.length,
    reverseCount: reverseSessions.length,
    bestClassicDurationMs,
    bestTimedScore,
    bestReverseDurationMs,
    avgAccuracy
  };
}

function normalizeSession(session: Session): Session {
  const resolvedTaskId = session.taskId ?? "schulte";
  const resolvedModuleId =
    session.moduleId ??
    (resolvedTaskId === "sprint_math" ? "sprint_math" : "schulte");

  return {
    ...session,
    taskId: resolvedTaskId,
    moduleId: resolvedModuleId,
    modeId:
      session.modeId ??
      (session.mode === "timed"
        ? "timed_plus"
        : session.mode === "reverse"
          ? "reverse"
          : session.mode === "sprint_math"
            ? "sprint_add_sub"
          : "classic_plus"),
    level: session.level ?? 1,
    presetId: session.presetId ?? "legacy",
    adaptiveSource: session.adaptiveSource ?? "legacy",
    visualThemeId: session.visualThemeId ?? "classic_bw",
    audioEnabledSnapshot: session.audioEnabledSnapshot ?? DEFAULT_AUDIO_SETTINGS
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function metricValue(session: Session, metric: GroupMetric): number {
  if (metric === "accuracy") {
    return session.accuracy * 100;
  }
  if (metric === "speed") {
    return session.speed;
  }
  return session.score;
}

function normalizePeriod(period: ComparePeriod): ComparePeriod {
  if (period === "all") {
    return period;
  }
  if (!Number.isFinite(period) || period <= 0) {
    return 30;
  }
  return Math.round(period);
}

function getFromLocalDate(period: ComparePeriod): string | null {
  if (period === "all") {
    return null;
  }
  const from = new Date();
  from.setDate(from.getDate() - period);
  return toLocalDateKey(from);
}

function filterByPeriod(sessions: Session[], period: ComparePeriod): Session[] {
  if (period === "all") {
    return sessions;
  }
  const fromLocalDate = getFromLocalDate(period);
  if (!fromLocalDate) {
    return sessions;
  }

  return sessions.filter((session) => {
    if (session.localDate) {
      return session.localDate >= fromLocalDate;
    }
    return toLocalDateKey(session.timestamp) >= fromLocalDate;
  });
}

export function buildModeMetricSnapshot(
  sessions: Session[],
  metric: GroupMetric
): ModeMetricSnapshot {
  if (sessions.length === 0) {
    return {
      summary: {
        best: null,
        avg: null,
        worst: null,
        sessionsTotal: 0,
        usersTotal: 0
      },
      byUser: []
    };
  }

  const allValues = sessions.map((session) => metricValue(session, metric));
  const perUserBuckets = new Map<string, number[]>();

  sessions.forEach((session) => {
    const bucket = perUserBuckets.get(session.userId) ?? [];
    bucket.push(metricValue(session, metric));
    perUserBuckets.set(session.userId, bucket);
  });

  const byUser = [...perUserBuckets.entries()]
    .map(([userId, values]) => ({
      userId,
      value: values.reduce((sum, value) => sum + value, 0) / values.length,
      sessions: values.length
    }))
    .sort((a, b) => b.value - a.value);

  return {
    summary: {
      best: Math.max(...allValues),
      avg: allValues.reduce((sum, value) => sum + value, 0) / allValues.length,
      worst: Math.min(...allValues),
      sessionsTotal: sessions.length,
      usersTotal: byUser.length
    },
    byUser
  };
}

async function loadModeSessions(
  modeId: TrainingModeId,
  period: ComparePeriod
): Promise<Session[]> {
  const fromLocalDate = getFromLocalDate(period);
  if (!fromLocalDate) {
    return db.sessions.where("modeId").equals(modeId).toArray();
  }

  return db.sessions
    .where("[modeId+localDate]")
    .between([modeId, fromLocalDate], [modeId, Dexie.maxKey])
    .toArray();
}

export function calculateStreak(localDates: string[]): number {
  if (localDates.length === 0) {
    return 0;
  }

  const uniqueSorted = [...new Set(localDates)].sort((a, b) => b.localeCompare(a));
  let streak = 0;
  let cursor = startOfDay(new Date());

  for (const dateKey of uniqueSorted) {
    const expected = toLocalDateKey(cursor);
    if (dateKey !== expected) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function recommendModeFromSessions(sessions: Session[]): ModeRecommendation {
  const modes: TrainingModeId[] = [
    "classic_plus",
    "timed_plus",
    "reverse",
    "sprint_add_sub",
    "sprint_mixed"
  ];
  const byMode = new Map<TrainingModeId, Session[]>();

  for (const modeId of modes) {
    byMode.set(modeId, []);
  }

  for (const session of sessions) {
    const bucket = byMode.get(session.modeId) ?? [];
    bucket.push(session);
    byMode.set(session.modeId, bucket);
  }

  const scores = modes.map((modeId) => {
    const recent = (byMode.get(modeId) ?? [])
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 3);
    if (recent.length === 0) {
      return { modeId, score: 0 };
    }
    const avgAccuracy =
      recent.reduce((sum, entry) => sum + entry.accuracy, 0) / recent.length;
    return { modeId, score: avgAccuracy };
  });

  scores.sort((a, b) => a.score - b.score);
  const selected = scores[0];
  return {
    modeId: selected.modeId,
    reason:
      "Рекомендуется режим с наименьшей текущей стабильностью точности.",
    confidence: 0.75
  };
}

export const sessionRepository = {
  async save(session: Session): Promise<void> {
    await db.sessions.put(normalizeSession(session));
  },

  async listByUser(userId: string): Promise<Session[]> {
    const sessions = await db.sessions.where("userId").equals(userId).toArray();
    return sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  async listByUserMode(userId: string, mode: Session["mode"]): Promise<Session[]> {
    const sessions = await db.sessions
      .where("userId")
      .equals(userId)
      .and((session) => session.mode === mode)
      .toArray();
    return sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  async aggregateDailyClassic(userId: string): Promise<ClassicDailyPoint[]> {
    const sessions = await db.sessions
      .where("userId")
      .equals(userId)
      .and((session) => session.modeId === "classic_plus")
      .toArray();
    return buildClassicDailyPoints(sessions);
  },

  async aggregateDailyTimed(userId: string): Promise<TimedDailyPoint[]> {
    const sessions = await db.sessions
      .where("userId")
      .equals(userId)
      .and((session) => session.modeId === "timed_plus")
      .toArray();
    return buildTimedDailyPoints(sessions);
  },

  async aggregateDailySprintMath(userId: string): Promise<SprintMathDailyPoint[]> {
    const sessions = await db.sessions
      .where("userId")
      .equals(userId)
      .and((session) => session.mode === "sprint_math")
      .toArray();
    return buildSprintMathDailyPoints(sessions);
  },

  async aggregateDailyByModeId(
    userId: string,
    modeId: TrainingModeId
  ): Promise<TimedDailyPoint[] | ClassicDailyPoint[] | SprintMathDailyPoint[]> {
    const sessions = await db.sessions
      .where("userId")
      .equals(userId)
      .and((session) => session.modeId === modeId)
      .toArray();

    if (modeId === "timed_plus") {
      return buildTimedDailyPoints(sessions);
    }
    if (modeId === "sprint_add_sub" || modeId === "sprint_mixed") {
      return buildSprintMathDailyPoints(sessions);
    }

    return buildClassicDailyPoints(sessions);
  },

  async getDailyProgressSummary(
    userId: string,
    localDate = toLocalDateKey(new Date())
  ): Promise<DailyProgressSummary> {
    const sessions = await db.sessions
      .where("[userId+localDate]")
      .equals([userId, localDate])
      .toArray();

    return buildDailyProgressSummary(sessions, localDate);
  },

  async getIndividualInsights(userId: string): Promise<{
    streakDays: number;
    currentWeekAvgScore: number | null;
    previousWeekAvgScore: number | null;
    recommendation: ModeRecommendation;
  }> {
    const sessions = await db.sessions.where("userId").equals(userId).toArray();
    if (sessions.length === 0) {
      return {
        streakDays: 0,
        currentWeekAvgScore: null,
        previousWeekAvgScore: null,
        recommendation: {
          modeId: "classic_plus",
          reason: "Начните с базового режима Classic+.",
          confidence: 0.6
        }
      };
    }

    const streakDays = calculateStreak(sessions.map((entry) => entry.localDate));

    const now = new Date();
    const startCurrentWeek = new Date(now);
    startCurrentWeek.setDate(now.getDate() - 7);
    const startPreviousWeek = new Date(now);
    startPreviousWeek.setDate(now.getDate() - 14);

    const currentWeek = sessions.filter(
      (entry) => new Date(entry.timestamp) >= startCurrentWeek
    );
    const previousWeek = sessions.filter((entry) => {
      const date = new Date(entry.timestamp);
      return date >= startPreviousWeek && date < startCurrentWeek;
    });

    const currentWeekAvgScore = currentWeek.length
      ? currentWeek.reduce((sum, entry) => sum + entry.score, 0) /
        currentWeek.length
      : null;
    const previousWeekAvgScore = previousWeek.length
      ? previousWeek.reduce((sum, entry) => sum + entry.score, 0) /
        previousWeek.length
      : null;

    return {
      streakDays,
      currentWeekAvgScore,
      previousWeekAvgScore,
      recommendation: recommendModeFromSessions(sessions)
    };
  },

  async getModeMetricSnapshot(
    modeId: TrainingModeId,
    metric: GroupMetric,
    period: ComparePeriod
  ): Promise<ModeMetricSnapshot> {
    const normalizedPeriod = normalizePeriod(period);
    const sessions = await loadModeSessions(modeId, normalizedPeriod);
    const filtered = filterByPeriod(sessions, normalizedPeriod);
    return buildModeMetricSnapshot(filtered, metric);
  }
};
