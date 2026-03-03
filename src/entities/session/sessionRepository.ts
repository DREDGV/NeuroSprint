import Dexie from "dexie";
import { db } from "../../db/database";
import { dailyChallengeRepository } from "../challenge/dailyChallengeRepository";
import { toLocalDateKey } from "../../shared/lib/date/date";
import { DEFAULT_AUDIO_SETTINGS } from "../../shared/lib/audio/audioSettings";
import { moduleIdByModeId } from "../../shared/lib/training/modeMapping";
import { recommendModeByPerformance } from "../../shared/lib/training/recommendation";
import type {
  ClassicDailyPoint,
  CompareBandMetric,
  ComparePeriod,
  DailyCompareBandPoint,
  DailyProgressSummary,
  DecisionRushDailyPoint,
  GroupMetric,
  ModeRecommendation,
  NBackDailyPoint,
  ModeMetricSnapshot,
  PatternDailyPoint,
  ReactionDailyPoint,
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

export function buildReactionDailyPoints(sessions: Session[]): ReactionDailyPoint[] {
  const grouped = new Map<string, Session[]>();
  for (const session of sessions) {
    if (session.mode !== "reaction") {
      continue;
    }

    const bucket = grouped.get(session.localDate);
    if (bucket) {
      bucket.push(session);
    } else {
      grouped.set(session.localDate, [session]);
    }
  }

  const points: ReactionDailyPoint[] = [];
  for (const [date, values] of grouped.entries()) {
    const averageReactionMs =
      values.reduce((sum, entry) => sum + entry.durationMs, 0) / values.length;
    const bestReactionMs = Math.min(...values.map((entry) => entry.durationMs));
    const accuracy = values.reduce((sum, entry) => sum + entry.accuracy, 0) / values.length;
    const avgScore = values.reduce((sum, entry) => sum + entry.score, 0) / values.length;

    points.push({
      date,
      avgReactionMs: averageReactionMs,
      bestReactionMs,
      accuracy,
      avgScore,
      count: values.length
    });
  }

  return points.sort(byDateAsc);
}

export function buildNBackDailyPoints(sessions: Session[]): NBackDailyPoint[] {
  const grouped = new Map<string, Session[]>();
  for (const session of sessions) {
    if (session.mode !== "n_back") {
      continue;
    }

    const bucket = grouped.get(session.localDate);
    if (bucket) {
      bucket.push(session);
    } else {
      grouped.set(session.localDate, [session]);
    }
  }

  const points: NBackDailyPoint[] = [];
  for (const [date, values] of grouped.entries()) {
    const accuracy = values.reduce((sum, entry) => sum + entry.accuracy, 0) / values.length;
    const avgScore = values.reduce((sum, entry) => sum + entry.score, 0) / values.length;
    const speed = values.reduce((sum, entry) => sum + entry.speed, 0) / values.length;

    points.push({
      date,
      accuracy,
      avgScore,
      speed,
      count: values.length
    });
  }

  return points.sort(byDateAsc);
}

export function buildDecisionRushDailyPoints(sessions: Session[]): DecisionRushDailyPoint[] {
  const grouped = new Map<string, Session[]>();
  for (const session of sessions) {
    if (session.mode !== "decision_rush") {
      continue;
    }

    const bucket = grouped.get(session.localDate);
    if (bucket) {
      bucket.push(session);
    } else {
      grouped.set(session.localDate, [session]);
    }
  }

  const points: DecisionRushDailyPoint[] = [];
  for (const [date, values] of grouped.entries()) {
    const accuracy = values.reduce((sum, entry) => sum + entry.accuracy, 0) / values.length;
    const avgScore = values.reduce((sum, entry) => sum + entry.score, 0) / values.length;
    const reactionP90Ms =
      values.reduce((sum, entry) => sum + (entry.reactionP90Ms ?? entry.durationMs), 0) /
      values.length;
    const bestComboAvg =
      values.reduce((sum, entry) => sum + (entry.bestCombo ?? 0), 0) / values.length;

    points.push({
      date,
      accuracy,
      avgScore,
      reactionP90Ms,
      bestComboAvg,
      count: values.length
    });
  }

  return points.sort(byDateAsc);
}

export function buildPatternDailyPoints(sessions: Session[]): PatternDailyPoint[] {
  const grouped = new Map<string, Session[]>();
  for (const session of sessions) {
    if (session.mode !== "pattern_recognition") {
      continue;
    }

    const bucket = grouped.get(session.localDate);
    if (bucket) {
      bucket.push(session);
    } else {
      grouped.set(session.localDate, [session]);
    }
  }

  const points: PatternDailyPoint[] = [];
  for (const [date, values] of grouped.entries()) {
    const accuracy = values.reduce((sum, entry) => sum + entry.accuracy, 0) / values.length;
    const avgScore = values.reduce((sum, entry) => sum + entry.score, 0) / values.length;
    const avgReactionTimeMs =
      values.reduce((sum, entry) => sum + (entry.reactionP90Ms ?? entry.durationMs), 0) /
      values.length;
    const bestStreak = Math.max(...values.map(entry => entry.bestCombo ?? 0));

    points.push({
      date,
      accuracy,
      avgScore,
      avgReactionTimeMs,
      bestStreak,
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
    (resolvedTaskId === "sprint_math"
      ? "sprint_math"
      : resolvedTaskId === "reaction"
        ? "reaction"
      : resolvedTaskId === "n_back"
        ? "n_back"
        : resolvedTaskId === "memory_grid"
          ? "memory_grid"
      : resolvedTaskId === "decision_rush"
        ? "decision_rush"
        : resolvedTaskId === "pattern_recognition"
          ? "pattern_recognition"
        : "schulte");

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
            : session.mode === "reaction"
              ? "reaction_signal"
              : session.mode === "n_back"
                ? "nback_1"
              : session.mode === "memory_grid"
                ? "memory_grid_classic"
              : session.mode === "decision_rush"
                ? "decision_standard"
              : session.mode === "pattern_recognition"
                ? "pattern_classic"
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

function compareMetricValue(session: Session, metric: CompareBandMetric): number {
  if (metric === "duration_sec") {
    return session.durationMs / 1000;
  }
  return session.score;
}

export function calculatePercentileValue(values: number[], percentile: number): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) {
    return sorted[0];
  }

  const normalized = Math.max(0, Math.min(1, percentile));
  const index = (sorted.length - 1) * normalized;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const lowerValue = sorted[lower] ?? sorted[0];
  const upperValue = sorted[upper] ?? sorted[sorted.length - 1];

  if (lower === upper) {
    return lowerValue;
  }

  const ratio = index - lower;
  return lowerValue + (upperValue - lowerValue) * ratio;
}

export function buildDailyCompareBandPoints(
  sessions: Session[],
  metric: CompareBandMetric
): DailyCompareBandPoint[] {
  const groupedByDateUser = new Map<string, Map<string, { sum: number; count: number }>>();

  sessions.forEach((session) => {
    const date = session.localDate ?? toLocalDateKey(session.timestamp);
    const value = compareMetricValue(session, metric);
    const usersMap = groupedByDateUser.get(date) ?? new Map<string, { sum: number; count: number }>();
    const userBucket = usersMap.get(session.userId) ?? { sum: 0, count: 0 };

    userBucket.sum += value;
    userBucket.count += 1;
    usersMap.set(session.userId, userBucket);
    groupedByDateUser.set(date, usersMap);
  });

  const points: DailyCompareBandPoint[] = [];
  groupedByDateUser.forEach((usersMap, date) => {
    const userValues = [...usersMap.values()].map((bucket) => bucket.sum / bucket.count);
    const p25 = calculatePercentileValue(userValues, 0.25);
    const median = calculatePercentileValue(userValues, 0.5);
    const p75 = calculatePercentileValue(userValues, 0.75);
    const sessionsCount = [...usersMap.values()].reduce((sum, bucket) => sum + bucket.count, 0);

    if (p25 == null || median == null || p75 == null) {
      return;
    }

    points.push({
      date,
      p25,
      median,
      p75,
      usersCount: userValues.length,
      sessionsCount
    });
  });

  return points.sort(byDateAsc);
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
  const moduleId = moduleIdByModeId(modeId);
  const fromLocalDate = getFromLocalDate(period);
  if (!fromLocalDate) {
    return db.sessions
      .where("modeId")
      .equals(modeId)
      .and((session) => session.moduleId === moduleId)
      .toArray();
  }

  return db.sessions
    .where("[modeId+localDate]")
    .between([modeId, fromLocalDate], [modeId, Dexie.maxKey])
    .and((session) => session.moduleId === moduleId)
    .toArray();
}

async function loadModeSessionsByIds(
  modeIds: TrainingModeId[],
  period: ComparePeriod
): Promise<Session[]> {
  const uniqueModeIds = [...new Set(modeIds)];
  if (uniqueModeIds.length === 0) {
    return [];
  }

  const batches = await Promise.all(uniqueModeIds.map((modeId) => loadModeSessions(modeId, period)));
  return batches.flat();
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
  return recommendModeByPerformance(sessions);
}

export const sessionRepository = {
  async save(session: Session): Promise<void> {
    const normalized = normalizeSession(session);
    await db.sessions.put(normalized);
    await dailyChallengeRepository.registerSession(normalized);
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

  async aggregateDailyReaction(userId: string): Promise<ReactionDailyPoint[]> {
    const sessions = await db.sessions
      .where("userId")
      .equals(userId)
      .and((session) => session.mode === "reaction")
      .toArray();
    return buildReactionDailyPoints(sessions);
  },

  async aggregateDailyNBack(userId: string): Promise<NBackDailyPoint[]> {
    const sessions = await db.sessions
      .where("userId")
      .equals(userId)
      .and((session) => session.mode === "n_back")
      .toArray();
    return buildNBackDailyPoints(sessions);
  },

  async aggregateDailyDecisionRush(userId: string): Promise<DecisionRushDailyPoint[]> {
    const sessions = await db.sessions
      .where("userId")
      .equals(userId)
      .and((session) => session.mode === "decision_rush")
      .toArray();
    return buildDecisionRushDailyPoints(sessions);
  },

  async aggregateDailyPattern(userId: string): Promise<PatternDailyPoint[]> {
    const sessions = await db.sessions
      .where("userId")
      .equals(userId)
      .and((session) => session.mode === "pattern_recognition")
      .toArray();
    return buildPatternDailyPoints(sessions);
  },

  async aggregateDailyByModeId(
    userId: string,
    modeId: TrainingModeId
  ): Promise<
    | TimedDailyPoint[]
    | ClassicDailyPoint[]
    | SprintMathDailyPoint[]
    | ReactionDailyPoint[]
    | NBackDailyPoint[]
    | DecisionRushDailyPoint[]
    | PatternDailyPoint[]
  > {
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
    if (
      modeId === "reaction_signal" ||
      modeId === "reaction_stroop" ||
      modeId === "reaction_pair" ||
      modeId === "reaction_number"
    ) {
      return buildReactionDailyPoints(sessions);
    }
    if (
      modeId === "nback_1" ||
      modeId === "nback_1_4x4" ||
      modeId === "nback_2" ||
      modeId === "nback_2_4x4" ||
      modeId === "nback_3"
    ) {
      return buildNBackDailyPoints(sessions);
    }
    if (
      modeId === "decision_kids" ||
      modeId === "decision_standard" ||
      modeId === "decision_pro"
    ) {
      return buildDecisionRushDailyPoints(sessions);
    }
    if (
      modeId === "pattern_classic" ||
      modeId === "pattern_timed" ||
      modeId === "pattern_progressive" ||
      modeId === "pattern_learning" ||
      modeId === "pattern_multi"
    ) {
      return buildPatternDailyPoints(sessions);
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
  },

  async aggregateDailyCompareBand(
    modeIds: TrainingModeId[],
    metric: CompareBandMetric,
    period: ComparePeriod
  ): Promise<DailyCompareBandPoint[]> {
    const normalizedPeriod = normalizePeriod(period);
    const sessions = await loadModeSessionsByIds(modeIds, normalizedPeriod);
    const filtered = filterByPeriod(sessions, normalizedPeriod);
    return buildDailyCompareBandPoints(filtered, metric);
  }
};
