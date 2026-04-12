import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useActiveUser } from "../app/ActiveUserContext";
import { useRoleAccess } from "../app/useRoleAccess";
import { groupRepository } from "../entities/group/groupRepository";
import { sessionRepository } from "../entities/session/sessionRepository";
import { trainingRepository } from "../entities/training/trainingRepository";
import { normalizeUserRole } from "../entities/user/userRole";
import { userRepository } from "../entities/user/userRepository";
import { appRoleLabel } from "../shared/lib/settings/appRole";
import {
  isDecisionRushMode,
  isMemoryGridMode,
  isNBackMode,
  isReactionMode,
  isSprintMathMode,
  isTimedMode,
  moduleIdByModeId
} from "../shared/lib/training/modeMapping";
import { TRAINING_MODES } from "../shared/lib/training/presets";
import { StatCard } from "../shared/ui/StatCard";
import type {
  ClassGroup,
  ClassicDailyPoint,
  DecisionRushDailyPoint,
  GroupMetric,
  MemoryGridDailyPoint,
  ModeMetricSnapshot,
  ModeRecommendation,
  NBackDailyPoint,
  ReactionDailyPoint,
  Session,
  SprintMathDailyPoint,
  TimedDailyPoint,
  TrainingModeId,
  TrainingModuleId,
  User,
  UserModeProfile
} from "../shared/types/domain";

const STATS_TRAINING_MODES = TRAINING_MODES.filter(
  (mode) => mode.moduleId !== "pattern_recognition"
);

const STATS_MODULE_ORDER: TrainingModuleId[] = [
  "schulte",
  "sprint_math",
  "reaction",
  "n_back",
  "memory_grid",
  "decision_rush"
];

const STATS_MODULE_LABELS: Record<TrainingModuleId, string> = {
  schulte: "Шульте",
  sprint_math: "Математический спринт",
  reaction: "Реакция",
  n_back: "N-Назад",
  memory_grid: "Сетка памяти",
  spatial_memory: "Пространственная память",
  decision_rush: "Быстрые решения",
  memory_match: "Пары памяти",
  pattern_recognition: "Распознавание паттернов"
};

function calculateStability(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function metricTitle(metric: GroupMetric): string {
  if (metric === "accuracy") {
    return "Точность (%)";
  }
  if (metric === "speed") {
    return "Скорость";
  }
  return "Результат (score)";
}

function formatMetricValue(value: number | null | undefined, metric: GroupMetric): string {
  if (value == null) {
    return "—";
  }
  if (metric === "accuracy") {
    return `${value.toFixed(1)}%`;
  }
  return value.toFixed(2);
}

function averageOrNull(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatDelta(current: number | null, previous: number | null, suffix = ""): string {
  if (current == null || previous == null) {
    return "—";
  }
  const delta = current - previous;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)}${suffix}`;
}

export function StatsIndividualPage() {
  const { activeUserId } = useActiveUser();
  const access = useRoleAccess();
  const canViewGroupStatsAccess = access.stats.viewGroup;
  const canViewComparisonAccess = access.stats.viewComparison;
  const [modeId, setModeId] = useState<TrainingModeId>("classic_plus");
  const [dailyClassic, setDailyClassic] = useState<ClassicDailyPoint[]>([]);
  const [dailyTimed, setDailyTimed] = useState<TimedDailyPoint[]>([]);
  const [dailyReaction, setDailyReaction] = useState<ReactionDailyPoint[]>([]);
  const [dailyNBack, setDailyNBack] = useState<NBackDailyPoint[]>([]);
  const [dailyMemoryGrid, setDailyMemoryGrid] = useState<MemoryGridDailyPoint[]>([]);
  const [dailyDecision, setDailyDecision] = useState<DecisionRushDailyPoint[]>([]);
  const [dailySprintMath, setDailySprintMath] = useState<SprintMathDailyPoint[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [profiles, setProfiles] = useState<UserModeProfile[]>([]);
  const [recommendation, setRecommendation] = useState<ModeRecommendation | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [currentWeekAvgScore, setCurrentWeekAvgScore] = useState<number | null>(null);
  const [previousWeekAvgScore, setPreviousWeekAvgScore] = useState<number | null>(null);
  const [accuracyStability, setAccuracyStability] = useState<number | null>(null);
  const [levelTrend, setLevelTrend] = useState<Array<{ date: string; avgLevel: number }>>([]);

  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [compareMetric, setCompareMetric] = useState<GroupMetric>("score");
  const [comparePeriod, setComparePeriod] = useState<number | "all">(30);
  const [compareUserId, setCompareUserId] = useState("");
  const [compareGroupId, setCompareGroupId] = useState("");
  const [myMetricValue, setMyMetricValue] = useState<number | null>(null);
  const [otherUserValue, setOtherUserValue] = useState<number | null>(null);
  const [groupValue, setGroupValue] = useState<number | null>(null);
  const [globalValue, setGlobalValue] = useState<number | null>(null);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<number | "all">(30);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardSnapshot, setLeaderboardSnapshot] = useState<ModeMetricSnapshot | null>(null);

  const [loading, setLoading] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeUserId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const modeModuleId = moduleIdByModeId(modeId);
        const [daily, insights, modeProfiles, sessions, loadedUsers, loadedGroups] =
          await Promise.all([
            sessionRepository.aggregateDailyByModeId(activeUserId, modeId),
            sessionRepository.getIndividualInsights(activeUserId),
            trainingRepository.listUserModeProfiles(activeUserId),
            trainingRepository.listRecentSessionsByMode(
              activeUserId,
              modeModuleId,
              modeId,
              30
            ),
            canViewComparisonAccess ? userRepository.list() : Promise.resolve([]),
            canViewComparisonAccess
              ? groupRepository.listGroupsForUser(activeUserId)
              : Promise.resolve([])
          ]);

        if (cancelled) {
          return;
        }

        if (isTimedMode(modeId)) {
          setDailyTimed(daily as TimedDailyPoint[]);
          setDailyClassic([]);
          setDailyReaction([]);
          setDailyNBack([]);
          setDailyMemoryGrid([]);
          setDailyDecision([]);
          setDailySprintMath([]);
        } else if (isSprintMathMode(modeId)) {
          setDailySprintMath(daily as SprintMathDailyPoint[]);
          setDailyTimed([]);
          setDailyReaction([]);
          setDailyNBack([]);
          setDailyMemoryGrid([]);
          setDailyDecision([]);
          setDailyClassic([]);
        } else if (isReactionMode(modeId)) {
          setDailyReaction(daily as ReactionDailyPoint[]);
          setDailyTimed([]);
          setDailyClassic([]);
          setDailyNBack([]);
          setDailyMemoryGrid([]);
          setDailyDecision([]);
          setDailySprintMath([]);
        } else if (isNBackMode(modeId)) {
          setDailyNBack(daily as NBackDailyPoint[]);
          setDailyTimed([]);
          setDailyClassic([]);
          setDailyReaction([]);
          setDailyMemoryGrid([]);
          setDailyDecision([]);
          setDailySprintMath([]);
        } else if (isMemoryGridMode(modeId)) {
          setDailyMemoryGrid(daily as MemoryGridDailyPoint[]);
          setDailyTimed([]);
          setDailyClassic([]);
          setDailyReaction([]);
          setDailyNBack([]);
          setDailyDecision([]);
          setDailySprintMath([]);
        } else if (isDecisionRushMode(modeId)) {
          setDailyDecision(daily as DecisionRushDailyPoint[]);
          setDailyTimed([]);
          setDailyClassic([]);
          setDailyReaction([]);
          setDailyNBack([]);
          setDailyMemoryGrid([]);
          setDailySprintMath([]);
        } else {
          setDailyClassic(daily as ClassicDailyPoint[]);
          setDailyTimed([]);
          setDailyReaction([]);
          setDailyNBack([]);
          setDailyMemoryGrid([]);
          setDailyDecision([]);
          setDailySprintMath([]);
        }
        setRecentSessions(sessions);

        setProfiles(modeProfiles);
        setRecommendation(insights.recommendation);
        setStreakDays(insights.streakDays);
        setCurrentWeekAvgScore(insights.currentWeekAvgScore);
        setPreviousWeekAvgScore(insights.previousWeekAvgScore);
        setAccuracyStability(
          calculateStability(sessions.map((entry) => entry.accuracy).slice(0, 5))
        );

        const byDate = new Map<string, number[]>();
        sessions.forEach((entry) => {
          const bucket = byDate.get(entry.localDate) ?? [];
          bucket.push(entry.level);
          byDate.set(entry.localDate, bucket);
        });

        const trend = [...byDate.entries()]
          .map(([date, levels]) => ({
            date,
            avgLevel: levels.reduce((sum, level) => sum + level, 0) / levels.length
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
        setLevelTrend(trend);

        setUsers(loadedUsers as User[]);
        setGroups(loadedGroups as ClassGroup[]);

        if (!canViewComparisonAccess) {
          setCompareUserId("");
          setCompareGroupId("");
        } else {
          const usersSafe = loadedUsers as User[];
          const groupsSafe = loadedGroups as ClassGroup[];
          const firstOtherUser = usersSafe.find((entry) => entry.id !== activeUserId);
          if (!firstOtherUser) {
            setCompareUserId("");
          } else if (
            !compareUserId ||
            compareUserId === activeUserId ||
            !usersSafe.some((entry) => entry.id === compareUserId)
          ) {
            setCompareUserId(firstOtherUser.id);
          }

          if (groupsSafe.length === 0) {
            setCompareGroupId("");
          } else if (
            !compareGroupId ||
            !groupsSafe.some((entry) => entry.id === compareGroupId)
          ) {
            setCompareGroupId(groupsSafe[0].id);
          }
        }
      } catch {
        if (!cancelled) {
          setError("Не удалось загрузить индивидуальную статистику.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUserId, canViewComparisonAccess, compareGroupId, compareUserId, modeId]);

  useEffect(() => {
    if (!activeUserId || !canViewComparisonAccess) {
      setMyMetricValue(null);
      setOtherUserValue(null);
      setGroupValue(null);
      setGlobalValue(null);
      setComparisonLoading(false);
      return;
    }

    let cancelled = false;
    setComparisonLoading(true);

    void (async () => {
      try {
        const [snapshot, groupStats] = await Promise.all([
          sessionRepository.getModeMetricSnapshot(modeId, compareMetric, comparePeriod),
          compareGroupId
            ? groupRepository.aggregateGroupStats(compareGroupId, modeId, comparePeriod, compareMetric)
            : Promise.resolve(null)
        ]);

        if (cancelled) {
          return;
        }

        const me = snapshot.byUser.find((entry) => entry.userId === activeUserId)?.value ?? null;
        const other = compareUserId
          ? snapshot.byUser.find((entry) => entry.userId === compareUserId)?.value ?? null
          : null;

        setMyMetricValue(me);
        setOtherUserValue(other);
        setGroupValue(groupStats?.summary.avg ?? null);
        setGlobalValue(snapshot.summary.avg);
      } catch {
        if (!cancelled) {
          setMyMetricValue(null);
          setOtherUserValue(null);
          setGroupValue(null);
          setGlobalValue(null);
        }
      } finally {
        if (!cancelled) {
          setComparisonLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeUserId,
    canViewComparisonAccess,
    compareGroupId,
    compareMetric,
    comparePeriod,
    compareUserId,
    modeId
  ]);

  useEffect(() => {
    if (!activeUserId || !canViewComparisonAccess) {
      setLeaderboardSnapshot(null);
      setLeaderboardLoading(false);
      return;
    }

    let cancelled = false;
    setLeaderboardLoading(true);

    void sessionRepository
      .getModeMetricSnapshot(modeId, "score", leaderboardPeriod)
      .then((snapshot) => {
        if (!cancelled) {
          setLeaderboardSnapshot(snapshot);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLeaderboardSnapshot(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLeaderboardLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserId, canViewComparisonAccess, leaderboardPeriod, modeId]);

  const selectedMode = useMemo(
    () => STATS_TRAINING_MODES.find((entry) => entry.id === modeId) ?? STATS_TRAINING_MODES[0],
    [modeId]
  );

  const selectedModuleId = useMemo(() => moduleIdByModeId(modeId), [modeId]);

  const moduleModeMap = useMemo(() => {
    const grouped = new Map<TrainingModuleId, typeof STATS_TRAINING_MODES>();
    STATS_TRAINING_MODES.forEach((mode) => {
      const list = grouped.get(mode.moduleId) ?? [];
      list.push(mode);
      grouped.set(mode.moduleId, list);
    });
    return grouped;
  }, []);

  const selectedProfileLevel = useMemo(() => {
    const profile = profiles.find((entry) => entry.modeId === modeId);
    if (profile) {
      return String(profile.autoAdjust ? profile.level : profile.manualLevel ?? profile.level);
    }
    const latestLevel = recentSessions[0]?.level;
    return latestLevel ? String(latestLevel) : "—";
  }, [modeId, profiles, recentSessions]);

  const compareUserOptions = useMemo(
    () => users.filter((entry) => entry.id !== activeUserId),
    [activeUserId, users]
  );

  const compareUserName = useMemo(
    () => users.find((entry) => entry.id === compareUserId)?.name ?? "Другой пользователь",
    [compareUserId, users]
  );

  const compareGroupName = useMemo(
    () => groups.find((entry) => entry.id === compareGroupId)?.name ?? "Моя группа",
    [compareGroupId, groups]
  );

  const leaderboardRows = useMemo(
    () =>
      (leaderboardSnapshot?.byUser ?? []).slice(0, 10).map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        name: users.find((user) => user.id === entry.userId)?.name ?? "Пользователь",
        value: entry.value,
        sessions: entry.sessions
      })),
    [leaderboardSnapshot?.byUser, users]
  );

  const chartData = useMemo(() => {
    if (isTimedMode(modeId)) {
      return dailyTimed.map((entry) => ({
        date: entry.date,
        valueA: Number(entry.effectivePerMinute.toFixed(2)),
        valueB: Number(entry.avgScore.toFixed(2)),
        valueC: null,
        nameA: "effectiveCorrect / мин",
        nameB: "Средний score",
        nameC: ""
      }));
    }
    if (isReactionMode(modeId)) {
      return dailyReaction.map((entry) => ({
        date: entry.date,
        valueA: Number(entry.bestReactionMs.toFixed(0)),
        valueB: Number(entry.avgReactionMs.toFixed(0)),
        valueC: Number((entry.accuracy * 100).toFixed(1)),
        nameA: "Лучшее время (мс)",
        nameB: "Среднее время (мс)",
        nameC: "Точность (%)"
      }));
    }
    if (isNBackMode(modeId)) {
      return dailyNBack.map((entry) => ({
        date: entry.date,
        valueA: Number((entry.accuracy * 100).toFixed(1)),
        valueB: Number(entry.avgScore.toFixed(2)),
        valueC: Number(entry.speed.toFixed(2)),
        nameA: "Точность (%)",
        nameB: "Средний score",
        nameC: "Темп"
      }));
    }
    if (isMemoryGridMode(modeId)) {
      return dailyMemoryGrid.map((entry) => ({
        date: entry.date,
        valueA: Number((entry.accuracy * 100).toFixed(1)),
        valueB: Number(entry.avgScore.toFixed(2)),
        valueC: Number(entry.avgRecallTimeMs.toFixed(0)),
        nameA: "Точность (%)",
        nameB: "Средний score",
        nameC: "Время воспроизведения (мс)"
      }));
    }
    if (isDecisionRushMode(modeId)) {
      return dailyDecision.map((entry) => ({
        date: entry.date,
        valueA: Number((entry.accuracy * 100).toFixed(1)),
        valueB: Number(entry.avgScore.toFixed(2)),
        valueC: Number(entry.reactionP90Ms.toFixed(0)),
        nameA: "Точность (%)",
        nameB: "Средний score",
        nameC: "P90 (мс)"
      }));
    }
    if (isSprintMathMode(modeId)) {
      return dailySprintMath.map((entry) => ({
        date: entry.date,
        valueA: Number(entry.throughput.toFixed(2)),
        valueB: Number((entry.accuracy * 100).toFixed(2)),
        valueC: Number(entry.avgScore.toFixed(2)),
        nameA: "Задач/мин",
        nameB: "Точность (%)",
        nameC: "Средний score"
      }));
    }
    return dailyClassic.map((entry) => ({
      date: entry.date,
      valueA: Number((entry.bestDurationMs / 1000).toFixed(2)),
      valueB: Number((entry.avgDurationMs / 1000).toFixed(2)),
      valueC: null,
      nameA: "Лучшее время (сек)",
      nameB: "Среднее время (сек)",
        nameC: ""
      }));
  }, [
    dailyClassic,
    dailyDecision,
    dailyMemoryGrid,
    dailyNBack,
    dailyReaction,
    dailySprintMath,
    dailyTimed,
    modeId
  ]);

  const sprintSummary = useMemo(() => {
    if (!isSprintMathMode(modeId) || recentSessions.length === 0) {
      return null;
    }

    const avgThroughput =
      recentSessions.reduce((sum, entry) => sum + entry.speed, 0) / recentSessions.length;
    const avgAccuracy =
      (recentSessions.reduce((sum, entry) => sum + entry.accuracy, 0) / recentSessions.length) * 100;
    const avgScore =
      recentSessions.reduce((sum, entry) => sum + entry.score, 0) / recentSessions.length;
    const avgCorrect =
      recentSessions.reduce((sum, entry) => sum + (entry.correctCount ?? 0), 0) /
      recentSessions.length;
    const avgErrors =
      recentSessions.reduce((sum, entry) => sum + entry.errors, 0) / recentSessions.length;

    return {
      avgThroughput,
      avgAccuracy,
      avgScore,
      avgCorrect,
      avgErrors
    };
  }, [modeId, recentSessions]);

  const sprintTrend7d = useMemo(() => {
    if (!isSprintMathMode(modeId) || recentSessions.length === 0) {
      return null;
    }

    const now = new Date();
    const startCurrent = new Date(now);
    startCurrent.setDate(now.getDate() - 7);

    const startPrevious = new Date(now);
    startPrevious.setDate(now.getDate() - 14);

    const current = recentSessions.filter((entry) => new Date(entry.timestamp) >= startCurrent);
    const previous = recentSessions.filter((entry) => {
      const date = new Date(entry.timestamp);
      return date >= startPrevious && date < startCurrent;
    });

    const currentThroughput = averageOrNull(current.map((entry) => entry.speed));
    const previousThroughput = averageOrNull(previous.map((entry) => entry.speed));

    const currentAccuracy = averageOrNull(current.map((entry) => entry.accuracy * 100));
    const previousAccuracy = averageOrNull(previous.map((entry) => entry.accuracy * 100));

    const currentScore = averageOrNull(current.map((entry) => entry.score));
    const previousScore = averageOrNull(previous.map((entry) => entry.score));

    return {
      sessionsCurrent: current.length,
      sessionsPrevious: previous.length,
      currentThroughput,
      previousThroughput,
      currentAccuracy,
      previousAccuracy,
      currentScore,
      previousScore
    };
  }, [modeId, recentSessions]);

  return (
    <section className="panel" data-testid="stats-individual-page">
      <h2>Индивидуальная статистика</h2>
      <p>Текущие достижения, тренд сложности и рекомендации на сегодня.</p>
      <p className="status-line">
        Здесь показываются только официально поддерживаемые модули. Экспериментальные
        тренажёры пока не входят в индивидуальную аналитику.
      </p>

      <div className="segmented-row">
        <Link className="btn-secondary is-active" to="/stats/individual">
          Индивидуальная
        </Link>
        {canViewGroupStatsAccess ? (
          <Link className="btn-secondary" to="/stats/group">
            Группа
          </Link>
        ) : null}
      </div>

      <div className="segmented-row" data-testid="stats-individual-module-row">
        {STATS_MODULE_ORDER.map((moduleId) => {
          const firstMode = moduleModeMap.get(moduleId)?.[0];
          if (!firstMode) {
            return null;
          }
          return (
            <button
              key={moduleId}
              type="button"
              className={selectedModuleId === moduleId ? "btn-secondary is-active" : "btn-secondary"}
              data-testid={`stats-individual-module-${moduleId}`}
              onClick={() => setModeId(firstMode.id)}
            >
              {STATS_MODULE_LABELS[moduleId]}
            </button>
          );
        })}
      </div>

      <div className="segmented-row">
        {STATS_TRAINING_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={modeId === mode.id ? "btn-secondary is-active" : "btn-secondary"}
            onClick={() => setModeId(mode.id)}
          >
            {mode.title}
          </button>
        ))}
      </div>

      <div className="stats-grid compact">
        <StatCard title="Режим" value={selectedMode.title} />
        <StatCard title="Текущий уровень" value={selectedProfileLevel} />
        <StatCard title="Серия дней" value={String(streakDays)} />
        <StatCard
          title="Стабильность точности"
          value={accuracyStability != null ? accuracyStability.toFixed(3) : "—"}
        />
        <StatCard
          title="Средний score: эта неделя"
          value={currentWeekAvgScore != null ? currentWeekAvgScore.toFixed(2) : "—"}
        />
        <StatCard
          title="Средний score: прошлая"
          value={previousWeekAvgScore != null ? previousWeekAvgScore.toFixed(2) : "—"}
        />
      </div>

      {recommendation ? (
        <p className="status-line">
          Что делать дальше: {TRAINING_MODES.find((entry) => entry.id === recommendation.modeId)?.title ?? recommendation.modeId}. {recommendation.reason}
        </p>
      ) : (
        <p className="status-line">
          Что делать дальше: выберите режим, выполните несколько сессий и затем сравните график и уровень.
        </p>
      )}

      {sprintSummary ? (
        <section className="setup-block" data-testid="sprint-individual-insights">
          <h3>Sprint Math: последние 30 сессий</h3>
          <div className="stats-grid compact">
            <StatCard title="Задач/мин" value={sprintSummary.avgThroughput.toFixed(2)} />
            <StatCard title="Точность" value={`${sprintSummary.avgAccuracy.toFixed(1)}%`} />
            <StatCard title="Средний score" value={sprintSummary.avgScore.toFixed(2)} />
            <StatCard title="Верных задач" value={sprintSummary.avgCorrect.toFixed(1)} />
            <StatCard title="Ошибок" value={sprintSummary.avgErrors.toFixed(1)} />
          </div>
        </section>
      ) : null}

      {sprintTrend7d ? (
        <section className="setup-block" data-testid="sprint-individual-trend">
          <h3>Sprint Math: 7 дней vs предыдущие 7 дней</h3>
          <div className="stats-grid compact">
            <StatCard
              title="Текущий период (сессий)"
              value={String(sprintTrend7d.sessionsCurrent)}
            />
            <StatCard
              title="Предыдущий период (сессий)"
              value={String(sprintTrend7d.sessionsPrevious)}
            />
            <StatCard
              title="Δ темп"
              value={formatDelta(sprintTrend7d.currentThroughput, sprintTrend7d.previousThroughput)}
            />
            <StatCard
              title="Δ точность"
              value={formatDelta(sprintTrend7d.currentAccuracy, sprintTrend7d.previousAccuracy, "%")}
            />
            <StatCard
              title="Δ score"
              value={formatDelta(sprintTrend7d.currentScore, sprintTrend7d.previousScore)}
            />
          </div>
        </section>
      ) : null}

      {canViewComparisonAccess ? (
        <section className="setup-block" data-testid="individual-comparison-block">
          <h3>Дополнительно: сравнение результатов</h3>
          <div className="settings-form">
            <label htmlFor="compare-metric">Метрика сравнения</label>
            <select
              id="compare-metric"
              value={compareMetric}
              onChange={(event) => setCompareMetric(event.target.value as GroupMetric)}
            >
              <option value="score">Результат (score)</option>
              <option value="accuracy">Точность</option>
              <option value="speed">Скорость</option>
            </select>

            <label htmlFor="compare-period">Период</label>
            <select
              id="compare-period"
              value={String(comparePeriod)}
              onChange={(event) =>
                setComparePeriod(event.target.value === "all" ? "all" : Number(event.target.value))
              }
            >
              <option value={7}>7 дней</option>
              <option value={30}>30 дней</option>
              <option value={90}>90 дней</option>
              <option value="all">Всё время</option>
            </select>

            <label htmlFor="compare-user">Пользователь</label>
            <select
              id="compare-user"
              value={compareUserId}
              onChange={(event) => setCompareUserId(event.target.value)}
            >
              <option value="">Выберите пользователя</option>
              {compareUserOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} ({appRoleLabel(normalizeUserRole(entry.role))})
                </option>
              ))}
            </select>

            <label htmlFor="compare-group">Группа</label>
            <select
              id="compare-group"
              value={compareGroupId}
              onChange={(event) => setCompareGroupId(event.target.value)}
            >
              <option value="">Без группы</option>
              {groups.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </div>

          <div className="comparison-grid">
            <StatCard title="Я" value={formatMetricValue(myMetricValue, compareMetric)} />
            <StatCard
              title={compareUserName}
              value={formatMetricValue(otherUserValue, compareMetric)}
            />
            <StatCard
              title={compareGroupName}
              value={formatMetricValue(groupValue, compareMetric)}
            />
            <StatCard
              title="Все пользователи"
              value={formatMetricValue(globalValue, compareMetric)}
            />
          </div>
          <p className="comparison-note">
            Сравнение по метрике: {metricTitle(compareMetric)} в режиме {selectedMode.title}.
          </p>
        </section>
      ) : (
        <p className="status-line" data-testid="individual-comparison-restricted-note">
          Сравнение с другими пользователями доступно для ролей «Учитель» и «Домашний».
        </p>
      )}

      {canViewComparisonAccess ? (
        <section className="setup-block" data-testid="individual-leaderboard-block">
          <h3>Дополнительно: лидерборд Top-10</h3>
          <div className="action-row">
            <label htmlFor="leaderboard-period">Период</label>
            <select
              id="leaderboard-period"
              value={String(leaderboardPeriod)}
              onChange={(event) =>
                setLeaderboardPeriod(
                  event.target.value === "all" ? "all" : Number(event.target.value)
                )
              }
              data-testid="individual-leaderboard-period"
            >
              <option value={7}>7 дней</option>
              <option value={30}>30 дней</option>
              <option value={90}>90 дней</option>
              <option value="all">Всё время</option>
            </select>
          </div>
          <p className="comparison-note">
            Рейтинг строится по среднему score в режиме {selectedMode.title}.
          </p>

          {leaderboardLoading ? (
            <p>Загрузка лидерборда...</p>
          ) : leaderboardRows.length === 0 ? (
            <p>Недостаточно данных для лидерборда.</p>
          ) : (
            <ol className="leaderboard-list" data-testid="individual-leaderboard-list">
              {leaderboardRows.map((entry) => (
                <li
                  key={entry.userId}
                  className={
                    entry.userId === activeUserId
                      ? "leaderboard-item is-active-user"
                      : "leaderboard-item"
                  }
                  data-testid={
                    entry.userId === activeUserId
                      ? "individual-leaderboard-active-user"
                      : undefined
                  }
                >
                  <div className="leaderboard-main">
                    <span className="leaderboard-rank">#{entry.rank}</span>
                    <span className="leaderboard-name">{entry.name}</span>
                  </div>
                  <div className="leaderboard-metrics">
                    <span className="leaderboard-score">{entry.value.toFixed(2)}</span>
                    <span className="leaderboard-sessions">{entry.sessions} сесс.</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}


      {loading ? <p>Загрузка статистики...</p> : null}
      {comparisonLoading ? <p>Загрузка блока сравнения...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {chartData.length === 0 ? (
        <p>Пока нет данных для выбранного режима.</p>
      ) : (
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="valueA"
                name={chartData[0]?.nameA}
                stroke="#1e7f71"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="valueB"
                name={chartData[0]?.nameB}
                stroke="#f2a93b"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
              {isSprintMathMode(modeId) ||
              isReactionMode(modeId) ||
              isNBackMode(modeId) ||
              isMemoryGridMode(modeId) ||
              isDecisionRushMode(modeId) ? (
                <Line
                  type="monotone"
                  dataKey="valueC"
                  name={chartData[0]?.nameC}
                  stroke="#2e62c9"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <section className="chart-box">
        <h3>Динамика уровня</h3>
        {levelTrend.length === 0 ? (
          <p>Недостаточно данных для динамики уровня.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={levelTrend}>
              <XAxis dataKey="date" />
              <YAxis domain={[1, 10]} allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="avgLevel"
                name="Средний уровень"
                stroke="#2e62c9"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>
    </section>
  );
}


