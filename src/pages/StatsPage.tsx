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
import { dailyChallengeRepository } from "../entities/challenge/dailyChallengeRepository";
import { sessionRepository } from "../entities/session/sessionRepository";
import { StatCard } from "../shared/ui/StatCard";
import type {
  ClassicDailyPoint,
  CompareBandMetric,
  ComparePeriod,
  DailyChallengeCompletionSummary,
  DailyChallengeHistoryItem,
  DailyChallengeStreakSummary,
  DailyChallengeTrendPoint,
  DailyCompareBandPoint,
  DecisionRushDailyPoint,
  MemoryGridDailyPoint,
  NBackDailyPoint,
  ReactionDailyPoint,
  SprintMathDailyPoint,
  TimedDailyPoint,
  TrainingModeId
} from "../shared/types/domain";

type StatsMode =
  | "classic"
  | "timed"
  | "sprint_math"
  | "reaction"
  | "n_back"
  | "memory_grid"
  | "decision_rush";
type ChartRange = 7 | 30 | 90 | "all";
type SprintModeFilter = "all" | "sprint_add_sub" | "sprint_mixed";
type SprintSubmode = "sprint_add_sub" | "sprint_mixed";

interface SprintSummary {
  sessions: number;
  avgThroughput: number | null;
  avgAccuracyPct: number | null;
  avgScore: number | null;
}

interface SprintComparisonSummary {
  addSub: SprintSummary;
  mixed: SprintSummary;
  bestMode: SprintSubmode | null;
  throughputDelta: number | null;
  accuracyDeltaPct: number | null;
  scoreDelta: number | null;
  ready: boolean;
}

interface ProgressSnapshot {
  label: string;
  value: number;
  date: string;
}

interface ProgressInsight {
  headline: string;
  previousAvg: number | null;
  currentAvg: number | null;
  changePct: number | null;
  snapshot: ProgressSnapshot | null;
}

interface CompareConfig {
  modeIds: TrainingModeId[];
  metric: CompareBandMetric;
  title: string;
  metricSuffix: string;
  digits: number;
}

interface CompareChartPoint {
  date: string;
  dateShort: string;
  me: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
}

interface ComparePlainSummary {
  headline: string;
  supporting: string;
  percentileText: string;
  userValueText: string;
  majorityText: string;
  tone: "positive" | "warning" | "neutral";
}

function formatDateShort(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) {
    return dateKey;
  }
  return `${day}.${month}`;
}

function formatPeriodLabel(period: ComparePeriod): string {
  if (period === "all") {
    return "все время";
  }
  return `${period} дн.`;
}

function filterRecentByDate<T extends { date: string }>(
  points: T[],
  range: ChartRange
): T[] {
  if (range === "all" || points.length === 0) {
    return points;
  }

  return points.slice(-range);
}

function formatMetric(value: number | null, digits = 2, suffix = ""): string {
  if (value == null) {
    return "-";
  }
  return `${value.toFixed(digits)}${suffix}`;
}

function formatSignedMetric(value: number | null, digits = 2, suffix = ""): string {
  if (value == null) {
    return "-";
  }
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}${suffix}`;
}

function sprintSubmodeLabel(mode: SprintSubmode): string {
  return mode === "sprint_add_sub" ? "Сложение / вычитание" : "Смешанный";
}

function summarizeSprint(data: SprintMathDailyPoint[]): SprintSummary {
  const sessions = data.reduce((sum, point) => sum + point.count, 0);
  if (sessions === 0) {
    return {
      sessions: 0,
      avgThroughput: null,
      avgAccuracyPct: null,
      avgScore: null
    };
  }

  const throughputWeighted =
    data.reduce((sum, point) => sum + point.throughput * point.count, 0) / sessions;
  const accuracyWeighted =
    data.reduce((sum, point) => sum + point.accuracy * point.count, 0) / sessions;
  const scoreWeighted = data.reduce((sum, point) => sum + point.avgScore * point.count, 0) / sessions;

  return {
    sessions,
    avgThroughput: throughputWeighted,
    avgAccuracyPct: accuracyWeighted * 100,
    avgScore: scoreWeighted
  };
}

function sprintFilterLabel(filter: SprintModeFilter): string {
  if (filter === "sprint_add_sub") {
    return "Сложение / вычитание";
  }
  if (filter === "sprint_mixed") {
    return "Смешанный";
  }
  return "Все режимы";
}

function resolveCompareConfig(mode: StatsMode, sprintFilter: SprintModeFilter): CompareConfig {
  if (mode === "classic") {
    return {
      modeIds: ["classic_plus"],
      metric: "duration_sec",
      title: "Сравнение по времени (сек)",
      metricSuffix: " сек",
      digits: 2
    };
  }

  if (mode === "timed") {
    return {
      modeIds: ["timed_plus"],
      metric: "score",
      title: "Сравнение по score",
      metricSuffix: "",
      digits: 2
    };
  }

  if (mode === "reaction") {
    return {
      modeIds: ["reaction_signal", "reaction_stroop", "reaction_pair", "reaction_number"],
      metric: "score",
      title: "Сравнение по score",
      metricSuffix: "",
      digits: 2
    };
  }

  if (mode === "n_back") {
    return {
      modeIds: ["nback_1", "nback_2"],
      metric: "score",
      title: "Сравнение по score (N-Back Lite)",
      metricSuffix: "",
      digits: 2
    };
  }

  if (mode === "memory_grid") {
    return {
      modeIds: [
        "memory_grid_classic",
        "memory_grid_classic_kids",
        "memory_grid_classic_pro",
        "memory_grid_classic_4x4",
        "memory_grid_classic_kids_4x4",
        "memory_grid_classic_pro_4x4",
        "memory_grid_rush",
        "memory_grid_rush_kids",
        "memory_grid_rush_pro",
        "memory_grid_rush_4x4",
        "memory_grid_rush_kids_4x4",
        "memory_grid_rush_pro_4x4"
      ],
      metric: "score",
      title: "Сравнение по score (Memory Grid)",
      metricSuffix: "",
      digits: 2
    };
  }

  if (mode === "decision_rush") {
    return {
      modeIds: ["decision_kids", "decision_standard", "decision_pro"],
      metric: "score",
      title: "Сравнение по score (Decision Rush)",
      metricSuffix: "",
      digits: 2
    };
  }

  if (sprintFilter === "sprint_add_sub") {
    return {
      modeIds: ["sprint_add_sub"],
      metric: "score",
      title: "Сравнение по score (Add/Sub)",
      metricSuffix: "",
      digits: 2
    };
  }

  if (sprintFilter === "sprint_mixed") {
    return {
      modeIds: ["sprint_mixed"],
      metric: "score",
      title: "Сравнение по score (Mixed)",
      metricSuffix: "",
      digits: 2
    };
  }

  return {
    modeIds: ["sprint_add_sub", "sprint_mixed"],
    metric: "score",
    title: "Сравнение по score (Sprint Math: все)",
    metricSuffix: "",
    digits: 2
  };
}

function buildSprintComparisonSummary(
  addSub: SprintSummary,
  mixed: SprintSummary
): SprintComparisonSummary {
  const hasAddSub = addSub.sessions > 0;
  const hasMixed = mixed.sessions > 0;
  const ready = hasAddSub && hasMixed;

  let bestMode: SprintSubmode | null = null;
  if (hasAddSub && !hasMixed) {
    bestMode = "sprint_add_sub";
  } else if (hasMixed && !hasAddSub) {
    bestMode = "sprint_mixed";
  } else if (ready) {
    const addScore = addSub.avgScore ?? 0;
    const mixedScore = mixed.avgScore ?? 0;
    bestMode = addScore >= mixedScore ? "sprint_add_sub" : "sprint_mixed";
  }

  const throughputDelta =
    addSub.avgThroughput != null && mixed.avgThroughput != null
      ? addSub.avgThroughput - mixed.avgThroughput
      : null;
  const accuracyDeltaPct =
    addSub.avgAccuracyPct != null && mixed.avgAccuracyPct != null
      ? addSub.avgAccuracyPct - mixed.avgAccuracyPct
      : null;
  const scoreDelta =
    addSub.avgScore != null && mixed.avgScore != null
      ? addSub.avgScore - mixed.avgScore
      : null;

  return {
    addSub,
    mixed,
    bestMode,
    throughputDelta,
    accuracyDeltaPct,
    scoreDelta,
    ready
  };
}

function average(numbers: number[]): number | null {
  if (numbers.length === 0) {
    return null;
  }
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function computeChangePercent(
  previous: number | null,
  current: number | null,
  higherIsBetter: boolean
): number | null {
  if (previous == null || current == null || previous === 0) {
    return null;
  }
  if (higherIsBetter) {
    return ((current - previous) / Math.abs(previous)) * 100;
  }
  return ((previous - current) / Math.abs(previous)) * 100;
}

function buildProgressHeadline(
  changePct: number | null,
  metricName: string,
  pointsCount: number
): string {
  if (changePct == null) {
    return "Недостаточно данных для сравнения по периодам.";
  }

  if (changePct >= 0) {
    return `Вы улучшили ${metricName} на +${changePct.toFixed(1)}% за ${pointsCount} дн.`;
  }

  return `Показатель ${metricName} снизился на ${Math.abs(changePct).toFixed(1)}% за ${pointsCount} дн.`;
}

function splitForTrend(values: number[]): { previous: number | null; current: number | null } {
  if (values.length < 4) {
    return { previous: null, current: null };
  }
  const middle = Math.floor(values.length / 2);
  const previous = average(values.slice(0, middle));
  const current = average(values.slice(middle));
  return { previous, current };
}

function formatSummaryPeriodLabel(range: ChartRange): string {
  return range === "all" ? "всё время" : `${range} дн.`;
}

function formatModeMetric(mode: StatsMode, value: number | null): string {
  if (mode === "classic") {
    return formatMetric(value, 2, " сек");
  }
  if (mode === "reaction") {
    return formatMetric(value, 0, " мс");
  }
  return formatMetric(value);
}

function getModeMetricHint(mode: StatsMode): string {
  if (mode === "classic") {
    return "Чем меньше секунд, тем лучше.";
  }
  if (mode === "reaction") {
    return "Чем меньше миллисекунд, тем быстрее реакция.";
  }
  return "Чем выше score, тем лучше результат.";
}

function buildFriendlyTrendSummary(changePct: number | null, sessionsCount: number): string {
  if (sessionsCount === 0) {
    return "Пока нет тренировок";
  }
  if (changePct == null) {
    return "Пока мало данных для вывода";
  }
  if (Math.abs(changePct) < 3) {
    return "Пока без резких изменений";
  }
  return changePct > 0
    ? `Есть прогресс: +${changePct.toFixed(1)}%`
    : `Есть спад: ${Math.abs(changePct).toFixed(1)}%`;
}

function buildSummaryHeroTitle(changePct: number | null, sessionsCount: number): string {
  if (sessionsCount === 0) {
    return "Пока нет данных по этому режиму";
  }
  if (changePct == null) {
    return "Вы уже начали, но для честного вывода нужно ещё немного данных";
  }
  if (Math.abs(changePct) < 3) {
    return "Результат держится примерно на одном уровне";
  }
  return changePct > 0
    ? "Есть заметный прогресс"
    : "Есть просадка: стоит спокойно закрепить базу";
}


function isLowerBetter(mode: StatsMode): boolean {
  return mode === "classic" || mode === "reaction";
}

function buildComparePlainSummary(
  mode: StatsMode,
  point: CompareChartPoint | null,
  progressChangePct: number | null
): ComparePlainSummary {
  if (
    !point ||
    point.me == null ||
    point.p25 == null ||
    point.median == null ||
    point.p75 == null
  ) {
    return {
      headline: "Сравнение с другими появится позже",
      supporting: "Пока мало общих данных по этому режиму.",
      percentileText: "Нужно ещё немного общих результатов.",
      userValueText: "Ваш результат: пока без сравнения",
      majorityText: "Ориентир большинства появится позже",
      tone: "neutral"
    };
  }

  const lowerBetter = isLowerBetter(mode);
  const currentValue = point.me;
  const betterThan = (threshold: number) =>
    lowerBetter ? currentValue <= threshold : currentValue >= threshold;
  const topThreshold = lowerBetter ? point.p25 : point.p75;
  const baseThreshold = lowerBetter ? point.p75 : point.p25;

  if (betterThan(topThreshold)) {
    return {
      headline: "Вы уже лучше, чем большинство",
      supporting: "Ваш результат сильнее, чем у основной части пользователей.",
      percentileText: "Лучше, чем примерно у 75% пользователей.",
      userValueText: `Ваш результат: ${formatModeMetric(mode, point.me)}`,
      majorityText: `Ориентир большинства: ${formatModeMetric(mode, point.median)}`,
      tone: "positive"
    };
  }

  if (betterThan(point.median)) {
    return {
      headline: "Вы уже выше среднего",
      supporting: "Результат лучше, чем у половины пользователей.",
      percentileText: "Лучше, чем примерно у 50% пользователей.",
      userValueText: `Ваш результат: ${formatModeMetric(mode, point.me)}`,
      majorityText: `Ориентир большинства: ${formatModeMetric(mode, point.median)}`,
      tone: "positive"
    };
  }

  if (betterThan(baseThreshold)) {
    return {
      headline: "Вы на уровне большинства",
      supporting: "Результат близок к основной группе пользователей.",
      percentileText: "Лучше, чем примерно у 25% пользователей.",
      userValueText: `Ваш результат: ${formatModeMetric(mode, point.me)}`,
      majorityText: `Ориентир большинства: ${formatModeMetric(mode, point.median)}`,
      tone: "neutral"
    };
  }

  return {
    headline:
      progressChangePct != null && progressChangePct > 0
        ? "Пока ниже среднего, но прогресс уже есть"
        : "Пока ниже среднего",
    supporting:
      progressChangePct != null && progressChangePct > 0
        ? "Продолжайте в том же темпе: вы уже двигаетесь к уровню большинства."
        : "Нужно ещё немного спокойных повторений, чтобы подтянуть базу.",
    percentileText: "Пока результат ниже, чем у большинства пользователей.",
    userValueText: `Ваш результат: ${formatModeMetric(mode, point.me)}`,
    majorityText: `Ориентир большинства: ${formatModeMetric(mode, point.median)}`,
    tone: "warning"
  };
}

export function StatsPage() {
  const { activeUserId } = useActiveUser();
  const access = useRoleAccess();
  const canViewGroupStatsAccess = access.stats.viewGroup;
  const [mode, setMode] = useState<StatsMode>("classic");
  const [sprintFilter, setSprintFilter] = useState<SprintModeFilter>("all");
  const [chartRange, setChartRange] = useState<ChartRange>(30);
  const [classicData, setClassicData] = useState<ClassicDailyPoint[]>([]);
  const [timedData, setTimedData] = useState<TimedDailyPoint[]>([]);
  const [reactionData, setReactionData] = useState<ReactionDailyPoint[]>([]);
  const [nBackData, setNBackData] = useState<NBackDailyPoint[]>([]);
  const [memoryGridData, setMemoryGridData] = useState<MemoryGridDailyPoint[]>([]);
  const [decisionData, setDecisionData] = useState<DecisionRushDailyPoint[]>([]);
  const [sprintAllData, setSprintAllData] = useState<SprintMathDailyPoint[]>([]);
  const [sprintAddSubData, setSprintAddSubData] = useState<SprintMathDailyPoint[]>([]);
  const [sprintMixedData, setSprintMixedData] = useState<SprintMathDailyPoint[]>([]);
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [comparePeriod, setComparePeriod] = useState<ComparePeriod>(30);
  const [compareBands, setCompareBands] = useState<DailyCompareBandPoint[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [challengePeriod, setChallengePeriod] = useState<ComparePeriod>(30);
  const [challengeSummary, setChallengeSummary] = useState<DailyChallengeCompletionSummary | null>(
    null
  );
  const [challengeHistory, setChallengeHistory] = useState<DailyChallengeHistoryItem[]>([]);
  const [challengeStreak, setChallengeStreak] = useState<DailyChallengeStreakSummary | null>(null);
  const [challengeTrend, setChallengeTrend] = useState<DailyChallengeTrendPoint[]>([]);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const compareConfig = useMemo(
    () => resolveCompareConfig(mode, sprintFilter),
    [mode, sprintFilter]
  );

  useEffect(() => {
    if (!activeUserId) {
      setClassicData([]);
      setTimedData([]);
      setReactionData([]);
      setNBackData([]);
      setMemoryGridData([]);
      setDecisionData([]);
      setSprintAllData([]);
      setSprintAddSubData([]);
      setSprintMixedData([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all([
      sessionRepository.aggregateDailyClassic(activeUserId),
      sessionRepository.aggregateDailyTimed(activeUserId),
      sessionRepository.aggregateDailyReaction(activeUserId),
      sessionRepository.aggregateDailyNBack(activeUserId),
      sessionRepository.aggregateDailyMemoryGrid(activeUserId),
      sessionRepository.aggregateDailyDecisionRush(activeUserId),
      sessionRepository.aggregateDailySprintMath(activeUserId),
      sessionRepository.aggregateDailyByModeId(activeUserId, "sprint_add_sub"),
      sessionRepository.aggregateDailyByModeId(activeUserId, "sprint_mixed")
    ])
      .then(
        ([
          classic,
          timed,
          reaction,
          nBack,
          memoryGrid,
          decision,
          sprintAll,
          sprintAddSub,
          sprintMixed
        ]) => {
        if (cancelled) {
          return;
        }
        setClassicData(classic);
        setTimedData(timed);
        setReactionData(reaction);
        setNBackData(nBack);
        setMemoryGridData(memoryGrid);
        setDecisionData(decision);
        setSprintAllData(sprintAll);
        setSprintAddSubData(sprintAddSub as SprintMathDailyPoint[]);
        setSprintMixedData(sprintMixed as SprintMathDailyPoint[]);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Не удалось загрузить статистику.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  useEffect(() => {
    if (!activeUserId) {
      setCompareBands([]);
      setCompareLoading(false);
      return;
    }

    if (!compareEnabled) {
      setCompareLoading(false);
      return;
    }

    let cancelled = false;
    setCompareLoading(true);

    void sessionRepository
      .aggregateDailyCompareBand(compareConfig.modeIds, compareConfig.metric, comparePeriod)
      .then((points) => {
        if (!cancelled) {
          setCompareBands(points);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompareBands([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCompareLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserId, compareConfig.metric, compareConfig.modeIds, compareEnabled, comparePeriod]);

  useEffect(() => {
    if (!activeUserId) {
      setChallengeSummary(null);
      setChallengeHistory([]);
      setChallengeStreak(null);
      setChallengeTrend([]);
      setChallengeLoading(false);
      return;
    }

    let cancelled = false;
    setChallengeLoading(true);

    void Promise.all([
      dailyChallengeRepository.getCompletionSummary(activeUserId, challengePeriod),
      dailyChallengeRepository.listHistory(activeUserId, challengePeriod, 10),
      dailyChallengeRepository.getStreakSummary(activeUserId, challengePeriod),
      dailyChallengeRepository.listCompletionTrend(activeUserId, challengePeriod, 60)
    ])
      .then(([summary, history, streak, trend]) => {
        if (cancelled) {
          return;
        }
        setChallengeSummary(summary);
        setChallengeHistory(history);
        setChallengeStreak(streak);
        setChallengeTrend(trend);
      })
      .catch(() => {
        if (!cancelled) {
          setChallengeSummary(null);
          setChallengeHistory([]);
          setChallengeStreak(null);
          setChallengeTrend([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setChallengeLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserId, challengePeriod]);

  const challengeTrendChartData = useMemo(
    () =>
      challengeTrend.map((entry) => ({
        ...entry,
        dateShort: formatDateShort(entry.localDate)
      })),
    [challengeTrend]
  );

  const sprintActiveData = useMemo(() => {
    if (sprintFilter === "sprint_add_sub") {
      return sprintAddSubData;
    }
    if (sprintFilter === "sprint_mixed") {
      return sprintMixedData;
    }
    return sprintAllData;
  }, [sprintAddSubData, sprintAllData, sprintFilter, sprintMixedData]);

  const classicChartData = useMemo(
    () =>
      classicData.map((entry) => ({
        date: entry.date,
        dateShort: formatDateShort(entry.date),
        bestSec: Number((entry.bestDurationMs / 1000).toFixed(2)),
        avgSec: Number((entry.avgDurationMs / 1000).toFixed(2))
      })),
    [classicData]
  );

  const timedChartData = useMemo(
    () =>
      timedData.map((entry) => ({
        date: entry.date,
        dateShort: formatDateShort(entry.date),
        effectivePerMinute: Number(entry.effectivePerMinute.toFixed(2)),
        avgScore: Number(entry.avgScore.toFixed(2))
      })),
    [timedData]
  );

  const reactionChartData = useMemo(
    () =>
      reactionData.map((entry) => ({
        date: entry.date,
        dateShort: formatDateShort(entry.date),
        avgReactionMs: Number(entry.avgReactionMs.toFixed(0)),
        bestReactionMs: Number(entry.bestReactionMs.toFixed(0)),
        accuracyPct: Number((entry.accuracy * 100).toFixed(1)),
        avgScore: Number(entry.avgScore.toFixed(2))
      })),
    [reactionData]
  );

  const nBackChartData = useMemo(
    () =>
      nBackData.map((entry) => ({
        date: entry.date,
        dateShort: formatDateShort(entry.date),
        accuracyPct: Number((entry.accuracy * 100).toFixed(1)),
        avgScore: Number(entry.avgScore.toFixed(2))
      })),
    [nBackData]
  );

  const memoryGridChartData = useMemo(
    () =>
      memoryGridData.map((entry) => ({
        date: entry.date,
        dateShort: formatDateShort(entry.date),
        accuracyPct: Number((entry.accuracy * 100).toFixed(1)),
        avgScore: Number(entry.avgScore.toFixed(2)),
        avgRecallTimeMs: Number(entry.avgRecallTimeMs.toFixed(0))
      })),
    [memoryGridData]
  );

  const decisionChartData = useMemo(
    () =>
      decisionData.map((entry) => ({
        date: entry.date,
        dateShort: formatDateShort(entry.date),
        accuracyPct: Number((entry.accuracy * 100).toFixed(1)),
        avgScore: Number(entry.avgScore.toFixed(2)),
        reactionP90Ms: Number(entry.reactionP90Ms.toFixed(0))
      })),
    [decisionData]
  );

  const sprintMathChartData = useMemo(
    () =>
      sprintActiveData.map((entry) => ({
        date: entry.date,
        dateShort: formatDateShort(entry.date),
        throughput: Number(entry.throughput.toFixed(2)),
        accuracyPct: Number((entry.accuracy * 100).toFixed(2)),
        avgScore: Number(entry.avgScore.toFixed(2))
      })),
    [sprintActiveData]
  );

  const visibleClassicChartData = useMemo(
    () => filterRecentByDate(classicChartData, chartRange),
    [chartRange, classicChartData]
  );
  const visibleTimedChartData = useMemo(
    () => filterRecentByDate(timedChartData, chartRange),
    [chartRange, timedChartData]
  );
  const visibleReactionChartData = useMemo(
    () => filterRecentByDate(reactionChartData, chartRange),
    [chartRange, reactionChartData]
  );
  const visibleNBackChartData = useMemo(
    () => filterRecentByDate(nBackChartData, chartRange),
    [chartRange, nBackChartData]
  );
  const visibleMemoryGridChartData = useMemo(
    () => filterRecentByDate(memoryGridChartData, chartRange),
    [chartRange, memoryGridChartData]
  );
  const visibleDecisionChartData = useMemo(
    () => filterRecentByDate(decisionChartData, chartRange),
    [chartRange, decisionChartData]
  );
  const visibleSprintMathChartData = useMemo(
    () => filterRecentByDate(sprintMathChartData, chartRange),
    [chartRange, sprintMathChartData]
  );

  const sprintSummary = useMemo(() => summarizeSprint(sprintActiveData), [sprintActiveData]);
  const sprintModeSummary = useMemo(
    () => ({
      addSub: summarizeSprint(sprintAddSubData),
      mixed: summarizeSprint(sprintMixedData)
    }),
    [sprintAddSubData, sprintMixedData]
  );
  const sprintComparison = useMemo(
    () => buildSprintComparisonSummary(sprintModeSummary.addSub, sprintModeSummary.mixed),
    [sprintModeSummary.addSub, sprintModeSummary.mixed]
  );

  const userCompareMetricByDate = useMemo(() => {
    const entries: Array<[string, number]> =
      mode === "classic"
        ? classicChartData.map((point) => [point.date, point.avgSec])
        : mode === "timed"
          ? timedChartData.map((point) => [point.date, point.avgScore])
          : mode === "reaction"
            ? reactionChartData.map((point) => [point.date, point.avgScore])
            : mode === "n_back"
              ? nBackChartData.map((point) => [point.date, point.avgScore])
              : mode === "memory_grid"
                ? memoryGridChartData.map((point) => [point.date, point.avgScore])
              : mode === "decision_rush"
                ? decisionChartData.map((point) => [point.date, point.avgScore])
            : sprintMathChartData.map((point) => [point.date, point.avgScore]);

    return new Map<string, number>(entries);
  }, [
    classicChartData,
    decisionChartData,
    memoryGridChartData,
    mode,
    nBackChartData,
    reactionChartData,
    sprintMathChartData,
    timedChartData
  ]);

  const compareChartData = useMemo<CompareChartPoint[]>(() => {
    const bandByDate = new Map(compareBands.map((point) => [point.date, point]));
    const dateSet = new Set<string>();
    compareBands.forEach((point) => dateSet.add(point.date));
    userCompareMetricByDate.forEach((_value, date) => dateSet.add(date));

    return [...dateSet]
      .sort((a, b) => a.localeCompare(b))
      .map((date) => {
        const band = bandByDate.get(date);
        const me = userCompareMetricByDate.get(date) ?? null;
        return {
          date,
          dateShort: formatDateShort(date),
          me,
          p25: band?.p25 ?? null,
          median: band?.median ?? null,
          p75: band?.p75 ?? null
        };
      });
  }, [compareBands, userCompareMetricByDate]);

  const compareLatestPoint = useMemo(
    () => (compareChartData.length > 0 ? compareChartData[compareChartData.length - 1] : null),
    [compareChartData]
  );
  const progressInsight = useMemo<ProgressInsight>(() => {
    if (mode === "classic") {
      const values = classicChartData.map((point) => point.bestSec);
      const trend = splitForTrend(values);
      const changePct = computeChangePercent(trend.previous, trend.current, false);
      const bestPoint =
        classicChartData.length > 0
          ? classicChartData.reduce((best, point) =>
              point.bestSec < best.bestSec ? point : best
            )
          : null;

      return {
        headline: buildProgressHeadline(changePct, "скорость прохождения", classicChartData.length),
        previousAvg: trend.previous,
        currentAvg: trend.current,
        changePct,
        snapshot: bestPoint
          ? {
              label: `Лучшее время: ${bestPoint.bestSec.toFixed(2)} сек`,
              value: bestPoint.bestSec,
              date: bestPoint.date
            }
          : null
      };
    }

    if (mode === "timed") {
      const values = timedChartData.map((point) => point.avgScore);
      const trend = splitForTrend(values);
      const changePct = computeChangePercent(trend.previous, trend.current, true);
      const bestPoint =
        timedChartData.length > 0
          ? timedChartData.reduce((best, point) =>
              point.avgScore > best.avgScore ? point : best
            )
          : null;

      return {
        headline: buildProgressHeadline(changePct, "score в Timed", timedChartData.length),
        previousAvg: trend.previous,
        currentAvg: trend.current,
        changePct,
        snapshot: bestPoint
          ? {
              label: `Лучший score: ${bestPoint.avgScore.toFixed(2)}`,
              value: bestPoint.avgScore,
              date: bestPoint.date
            }
          : null
      };
    }

    if (mode === "reaction") {
      const values = reactionChartData.map((point) => point.bestReactionMs);
      const trend = splitForTrend(values);
      const changePct = computeChangePercent(trend.previous, trend.current, false);
      const bestPoint =
        reactionChartData.length > 0
          ? reactionChartData.reduce((best, point) =>
              point.bestReactionMs < best.bestReactionMs ? point : best
            )
          : null;

      return {
        headline: buildProgressHeadline(changePct, "времени реакции", reactionChartData.length),
        previousAvg: trend.previous,
        currentAvg: trend.current,
        changePct,
        snapshot: bestPoint
          ? {
              label: `Лучший отклик: ${bestPoint.bestReactionMs.toFixed(0)} мс`,
              value: bestPoint.bestReactionMs,
              date: bestPoint.date
        }
          : null
      };
    }

    if (mode === "n_back") {
      const values = nBackChartData.map((point) => point.avgScore);
      const trend = splitForTrend(values);
      const changePct = computeChangePercent(trend.previous, trend.current, true);
      const bestPoint =
        nBackChartData.length > 0
          ? nBackChartData.reduce((best, point) =>
              point.avgScore > best.avgScore ? point : best
            )
          : null;

      return {
        headline: buildProgressHeadline(changePct, "score в N-Back Lite", nBackChartData.length),
        previousAvg: trend.previous,
        currentAvg: trend.current,
        changePct,
        snapshot: bestPoint
          ? {
              label: `Лучший score: ${bestPoint.avgScore.toFixed(2)}`,
              value: bestPoint.avgScore,
              date: bestPoint.date
            }
          : null
      };
    }

    if (mode === "memory_grid") {
      const values = memoryGridChartData.map((point) => point.avgScore);
      const trend = splitForTrend(values);
      const changePct = computeChangePercent(trend.previous, trend.current, true);
      const bestPoint =
        memoryGridChartData.length > 0
          ? memoryGridChartData.reduce((best, point) =>
              point.avgScore > best.avgScore ? point : best
            )
          : null;

      return {
        headline: buildProgressHeadline(
          changePct,
          "score в Memory Grid",
          memoryGridChartData.length
        ),
        previousAvg: trend.previous,
        currentAvg: trend.current,
        changePct,
        snapshot: bestPoint
          ? {
              label: `Лучший score: ${bestPoint.avgScore.toFixed(2)}`,
              value: bestPoint.avgScore,
              date: bestPoint.date
            }
          : null
      };
    }

    if (mode === "decision_rush") {
      const values = decisionChartData.map((point) => point.avgScore);
      const trend = splitForTrend(values);
      const changePct = computeChangePercent(trend.previous, trend.current, true);
      const bestPoint =
        decisionChartData.length > 0
          ? decisionChartData.reduce((best, point) =>
              point.avgScore > best.avgScore ? point : best
            )
          : null;

      return {
        headline: buildProgressHeadline(
          changePct,
          "score в Decision Rush",
          decisionChartData.length
        ),
        previousAvg: trend.previous,
        currentAvg: trend.current,
        changePct,
        snapshot: bestPoint
          ? {
              label: `Лучший score: ${bestPoint.avgScore.toFixed(2)}`,
              value: bestPoint.avgScore,
              date: bestPoint.date
            }
          : null
      };
    }

    const values = sprintMathChartData.map((point) => point.avgScore);
    const trend = splitForTrend(values);
    const changePct = computeChangePercent(trend.previous, trend.current, true);
    const bestPoint =
      sprintMathChartData.length > 0
        ? sprintMathChartData.reduce((best, point) =>
            point.avgScore > best.avgScore ? point : best
          )
        : null;

    return {
      headline: buildProgressHeadline(changePct, "score в Sprint Math", sprintMathChartData.length),
      previousAvg: trend.previous,
      currentAvg: trend.current,
      changePct,
      snapshot: bestPoint
        ? {
            label: `Лучший score: ${bestPoint.avgScore.toFixed(2)}`,
            value: bestPoint.avgScore,
            date: bestPoint.date
          }
        : null
    };
  }, [
    classicChartData,
    decisionChartData,
    memoryGridChartData,
    mode,
    nBackChartData,
    reactionChartData,
    sprintMathChartData,
    timedChartData
  ]);

  const selectedModeTitle = useMemo(() => {
    if (mode === "classic") {
      return "Таблицы Шульте";
    }
    if (mode === "timed") {
      return "Шульте на время";
    }
    if (mode === "reaction") {
      return "Скорость реакции";
    }
    if (mode === "n_back") {
      return "Память: N-Back";
    }
    if (mode === "memory_grid") {
      return "Память: сетка";
    }
    if (mode === "decision_rush") {
      return "Быстрый выбор";
    }
    return `Устный счёт: ${sprintFilterLabel(sprintFilter)}`;
  }, [mode, sprintFilter]);

  const sessionsInMode = useMemo(() => {
    if (mode === "classic") {
      return filterRecentByDate(classicData, chartRange).reduce((sum, point) => sum + point.count, 0);
    }
    if (mode === "timed") {
      return filterRecentByDate(timedData, chartRange).reduce((sum, point) => sum + point.count, 0);
    }
    if (mode === "reaction") {
      return filterRecentByDate(reactionData, chartRange).reduce((sum, point) => sum + point.count, 0);
    }
    if (mode === "n_back") {
      return filterRecentByDate(nBackData, chartRange).reduce((sum, point) => sum + point.count, 0);
    }
    if (mode === "memory_grid") {
      return filterRecentByDate(memoryGridData, chartRange).reduce((sum, point) => sum + point.count, 0);
    }
    if (mode === "decision_rush") {
      return filterRecentByDate(decisionData, chartRange).reduce((sum, point) => sum + point.count, 0);
    }
    return filterRecentByDate(sprintActiveData, chartRange).reduce((sum, point) => sum + point.count, 0);
  }, [
    chartRange,
    classicData,
    decisionData,
    memoryGridData,
    mode,
    nBackData,
    reactionData,
    sprintActiveData,
    timedData
  ]);

  const trendSummary = useMemo(() => {
    return buildFriendlyTrendSummary(progressInsight.changePct, sessionsInMode);
  }, [progressInsight.changePct, sessionsInMode]);

  const nextStepText = useMemo(() => {
    if (sessionsInMode === 0) {
      return "Сделайте 2-3 тренировки в выбранном режиме, чтобы появился осмысленный тренд.";
    }
    if (challengeSummary && challengeSummary.pending > 0) {
      return "Закройте челлендж дня, а затем сравните график после ещё одной сессии.";
    }
    if (progressInsight.changePct == null) {
      return "Сделайте ещё несколько сессий в этом режиме, чтобы сравнение по периодам стало устойчивым.";
    }
    if (progressInsight.changePct < 0) {
      return "Повторите режим в спокойном темпе и сфокусируйтесь на точности.";
    }
    if (mode === "sprint_math" && sprintComparison.bestMode) {
      return `Закрепите результат ещё одной сессией: ${sprintSubmodeLabel(sprintComparison.bestMode)}.`;
    }
    return "Продолжайте этот режим и вернитесь сюда после ещё 2-3 сессий.";
  }, [challengeSummary, mode, progressInsight.changePct, sessionsInMode, sprintComparison.bestMode]);

  const chartRangeLabel = useMemo(
    () => (chartRange === "all" ? "Всё время" : `${chartRange} дн.`),
    [chartRange]
  );
  const summaryPeriodLabel = useMemo(() => formatSummaryPeriodLabel(chartRange), [chartRange]);
  const summaryHeroTitle = useMemo(
    () => buildSummaryHeroTitle(progressInsight.changePct, sessionsInMode),
    [progressInsight.changePct, sessionsInMode]
  );
  const summaryTone = useMemo(() => {
    if (
      sessionsInMode === 0 ||
      progressInsight.changePct == null ||
      Math.abs(progressInsight.changePct) < 3
    ) {
      return "neutral";
    }
    return progressInsight.changePct > 0 ? "positive" : "warning";
  }, [progressInsight.changePct, sessionsInMode]);
  const summaryComparisonText = useMemo(() => {
    if (progressInsight.previousAvg == null || progressInsight.currentAvg == null) {
      return "Пока мало данных";
    }
    return `${formatModeMetric(mode, progressInsight.previousAvg)} > ${formatModeMetric(
      mode,
      progressInsight.currentAvg
    )}`;
  }, [mode, progressInsight.currentAvg, progressInsight.previousAvg]);
  const summaryBestText = useMemo(
    () => progressInsight.snapshot?.label ?? "Лучший результат появится после первых тренировок",
    [progressInsight.snapshot]
  );
  const summaryModeHint = useMemo(() => getModeMetricHint(mode), [mode]);
  const comparePlainSummary = useMemo(
    () => buildComparePlainSummary(mode, compareLatestPoint, progressInsight.changePct),
    [compareLatestPoint, mode, progressInsight.changePct]
  );
  const isEmpty = useMemo(() => {
    if (mode === "classic") {
      return visibleClassicChartData.length === 0;
    }
    if (mode === "timed") {
      return visibleTimedChartData.length === 0;
    }
    if (mode === "reaction") {
      return visibleReactionChartData.length === 0;
    }
    if (mode === "n_back") {
      return visibleNBackChartData.length === 0;
    }
    if (mode === "memory_grid") {
      return visibleMemoryGridChartData.length === 0;
    }
    if (mode === "decision_rush") {
      return visibleDecisionChartData.length === 0;
    }
    return visibleSprintMathChartData.length === 0;
  }, [
    mode,
    visibleClassicChartData.length,
    visibleDecisionChartData.length,
    visibleMemoryGridChartData.length,
    visibleNBackChartData.length,
    visibleReactionChartData.length,
    visibleSprintMathChartData.length,
    visibleTimedChartData.length
  ]);

  return (
    <section className="panel" data-testid="stats-page">
      <h2>Статистика</h2>
      <p className="stats-page-intro">
        Сначала — главный вывод по вашему прогрессу. Ниже можно уточнить режим, сравнение и детали.
      </p>

      <div className="stats-page-flow">
        <section className="setup-block stats-summary-block" data-testid="stats-primary-summary">
        <div className="stats-summary-hero">
          <div className="stats-summary-copy">
            <p className="stats-summary-eyebrow">Что видно сразу</p>
            <h3>{summaryHeroTitle}</h3>
            <p className="stats-summary-lead">
              {selectedModeTitle}. Короткий вывод за {summaryPeriodLabel}.
            </p>
          </div>
          <p className={`stats-summary-badge is-${summaryTone}`} data-testid="stats-summary-trend">
            {trendSummary}
          </p>
        </div>

        <div className="stats-summary-grid">
          <article className="stats-summary-card" data-testid="stats-summary-sessions">
            <p className="stats-summary-card-label">Сколько тренировок</p>
            <p className="stats-summary-card-value">{sessionsInMode}</p>
            <p className="stats-summary-card-hint">За {summaryPeriodLabel} в этом режиме.</p>
          </article>

          <article className="stats-summary-card" data-testid="stats-summary-comparison">
            <p className="stats-summary-card-label">Было и сейчас</p>
            <p className="stats-summary-card-value">{summaryComparisonText}</p>
            <p className="stats-summary-card-hint">{summaryModeHint}</p>
          </article>

          <article className="stats-summary-card" data-testid="stats-summary-best">
            <p className="stats-summary-card-label">Лучший ориентир</p>
            <p className="stats-summary-card-value">{summaryBestText}</p>
            <p className="stats-summary-card-hint">{chartRangeLabel} и выбранный режим.</p>
          </article>
        </div>

        <div className="stats-summary-next-step" data-testid="stats-summary-next-step">
          <p className="stats-summary-next-label">Что делать дальше</p>
          <p>{nextStepText}</p>
        </div>
      </section>

        <section className="setup-block stats-compare-quick" data-testid="stats-compare-plain">
          <div className="stats-compare-quick-header">
            <div className="stats-compare-quick-copy">
              <p className="stats-section-kicker">На фоне других</p>
              <h3>{comparePlainSummary.headline}</h3>
              <p className="comparison-note">{comparePlainSummary.supporting}</p>
            </div>
            <p className={`stats-summary-badge is-${comparePlainSummary.tone}`} data-testid="stats-compare-plain-badge">
              {compareLoading ? "Подбираем сравнение..." : comparePlainSummary.percentileText}
            </p>
          </div>
          <div className="stats-summary-grid">
            <article className="stats-summary-card" data-testid="stats-compare-plain-user">
              <p className="stats-summary-card-label">Ваш уровень сейчас</p>
              <p className="stats-summary-card-value">{comparePlainSummary.userValueText}</p>
              <p className="stats-summary-card-hint">Сравнение берём по последнему дню в выбранном режиме.</p>
            </article>
            <article className="stats-summary-card" data-testid="stats-compare-plain-majority">
              <p className="stats-summary-card-label">Ориентир большинства</p>
              <p className="stats-summary-card-value">{comparePlainSummary.majorityText}</p>
              <p className="stats-summary-card-hint">Это помогает понять, насколько результат уже силён.</p>
            </article>
          </div>
        </section>

        <section className="setup-block stats-controls-panel" data-testid="stats-controls-panel">
          <p className="stats-section-kicker">Режим и детали</p>
          <h3>Уточнить режим, период и подробности</h3>
          <p className="status-line">
            Если хотите глубже посмотреть статистику, переключите режим или откройте подробное сравнение ниже.
          </p>
          <div className="segmented-row stats-controls-row">
            <Link className="btn-secondary is-active" to="/stats">
              Простая
            </Link>
            <Link className="btn-secondary" to="/stats/individual">
              Расширенная
            </Link>
            {canViewGroupStatsAccess ? (
              <Link className="btn-secondary" to="/stats/group">
                Группа
              </Link>
            ) : null}
          </div>

          <div className="segmented-row stats-controls-row">
            <button
              type="button"
              className={mode === "classic" ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() => setMode("classic")}
              data-testid="stats-mode-classic"
            >
              Таблицы Шульте
            </button>
            <button
              type="button"
              className={mode === "timed" ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() => setMode("timed")}
              data-testid="stats-mode-timed"
            >
              Шульте на время
            </button>
            <button
              type="button"
              className={mode === "reaction" ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() => setMode("reaction")}
              data-testid="stats-mode-reaction"
            >
              Скорость реакции
            </button>
            <button
              type="button"
              className={mode === "n_back" ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() => setMode("n_back")}
              data-testid="stats-mode-nback"
            >
              Память: N-Back
            </button>
            <button
              type="button"
              className={mode === "memory_grid" ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() => setMode("memory_grid")}
              data-testid="stats-mode-memory-grid"
            >
              Память: сетка
            </button>
            <button
              type="button"
              className={mode === "decision_rush" ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() => setMode("decision_rush")}
              data-testid="stats-mode-decision-rush"
            >
              Быстрый выбор
            </button>
            <button
              type="button"
              className={mode === "sprint_math" ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() => setMode("sprint_math")}
              data-testid="stats-mode-sprint"
            >
              Устный счёт
            </button>
          </div>

          {mode === "sprint_math" ? (
            <div className="segmented-row stats-controls-row" data-testid="stats-sprint-filter-row">
              <button
                type="button"
                className={sprintFilter === "all" ? "btn-secondary is-active" : "btn-secondary"}
                onClick={() => setSprintFilter("all")}
                data-testid="stats-sprint-filter-all"
              >
                Все
              </button>
              <button
                type="button"
                className={sprintFilter === "sprint_add_sub" ? "btn-secondary is-active" : "btn-secondary"}
                onClick={() => setSprintFilter("sprint_add_sub")}
                data-testid="stats-sprint-filter-add-sub"
              >
                Сложение / вычитание
              </button>
              <button
                type="button"
                className={sprintFilter === "sprint_mixed" ? "btn-secondary is-active" : "btn-secondary"}
                onClick={() => setSprintFilter("sprint_mixed")}
                data-testid="stats-sprint-filter-mixed"
              >
                Смешанный
              </button>
            </div>
          ) : null}
        </section>

        <section className="setup-block stats-flow-details" data-testid="stats-progress-headline">
        <p className="stats-section-kicker">Подробности</p>
        <h3>Как меняется результат</h3>
        <p className="status-line">
          Сравниваем первую и вторую половину выбранного периода по этому режиму.
        </p>
        <div className="stats-grid compact">
          <StatCard
            title="Раньше"
            value={formatModeMetric(mode, progressInsight.previousAvg)}
          />
          <StatCard
            title="Сейчас"
            value={formatModeMetric(mode, progressInsight.currentAvg)}
          />
          <StatCard
            title="Разница"
            value={formatSignedMetric(progressInsight.changePct, 1, "%")}
          />
        </div>
        {progressInsight.snapshot ? (
          <p className="status-line">Дата рекорда: {progressInsight.snapshot.date}</p>
        ) : (
          <p className="status-line">Личный рекорд появится после первых сессий.</p>
        )}
      </section>

      <section className="setup-block stats-secondary-block stats-flow-secondary" data-testid="stats-daily-challenge-block">
        <h3>Дополнительно: челлендж дня</h3>
        <div className="action-row">
          <label htmlFor="stats-challenge-period">Период</label>
          <select
            id="stats-challenge-period"
            value={String(challengePeriod)}
            onChange={(event) =>
              setChallengePeriod(
                event.target.value === "all" ? "all" : Number(event.target.value)
              )
            }
            data-testid="stats-challenge-period"
          >
            <option value={7}>7 дней</option>
            <option value={30}>30 дней</option>
            <option value={90}>90 дней</option>
            <option value="all">Всё время</option>
          </select>
        </div>

        {challengeLoading ? (
          <p>Загрузка челленджа дня...</p>
        ) : challengeSummary ? (
          <>
            <div className="stats-grid compact" data-testid="stats-daily-challenge-summary">
              <StatCard title="Всего челленджей" value={String(challengeSummary.total)} />
              <StatCard title="Выполнено" value={String(challengeSummary.completed)} />
              <StatCard title="Осталось" value={String(challengeSummary.pending)} />
              <StatCard
                title="Выполнение"
                value={`${challengeSummary.completionRatePct.toFixed(1)}%`}
              />
            </div>

            <div className="stats-grid compact" data-testid="stats-daily-challenge-streak">
              <StatCard
                title="Текущая серия"
                value={`${challengeStreak?.currentStreakDays ?? 0} дн.`}
              />
              <StatCard title="Лучшая серия" value={`${challengeStreak?.bestStreakDays ?? 0} дн.`} />
              <StatCard
                title="Выполненных дней"
                value={String(challengeStreak?.completedDays ?? 0)}
              />
              <StatCard title="Период" value={formatPeriodLabel(challengeSummary.period)} />
            </div>
            <p className="comparison-note" data-testid="stats-daily-challenge-note">
              Период: {formatPeriodLabel(challengeSummary.period)}. Серия считается по дням подряд с выполненным челленджем.
            </p>

            {challengeTrendChartData.length > 0 ? (
              <div className="chart-box" data-testid="stats-daily-challenge-trend">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={challengeTrendChartData}>
                    <XAxis dataKey="dateShort" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.localDate ?? ""}
                    />
                    <Line
                      type="monotone"
                      dataKey="completionPct"
                      name="Выполнение челленджа (%)"
                      stroke="#1e7f71"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            {challengeHistory.length === 0 ? (
              <p className="status-line">За выбранный период челленджи ещё не создавались.</p>
            ) : (
              <ol className="challenge-history-list" data-testid="stats-daily-challenge-history">
                {challengeHistory.map((entry) => (
                  <li key={entry.challengeId} className="challenge-history-item">
                    <div className="challenge-history-main">
                      <span className="challenge-history-date">{entry.localDate}</span>
                      <span className="challenge-history-mode">{entry.modeTitle}</span>
                    </div>
                    <div className="challenge-history-side">
                      <span
                        className={
                          entry.status === "completed"
                            ? "challenge-status is-complete"
                            : "challenge-status"
                        }
                      >
                        {entry.status === "completed" ? "Выполнено" : "Не выполнено"}
                      </span>
                      <span className="challenge-history-attempts">
                        {entry.attemptsCount} / {entry.requiredAttempts}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
        ) : (
          <p className="status-line">Не удалось загрузить блок челленджа дня.</p>
        )}
      </section>

      {mode === "reaction" ? (
        <section className="setup-block stats-flow-details" data-testid="stats-reaction-summary">
          <h3>Reaction: итоги</h3>
          <div className="stats-grid compact">
            <StatCard
              title="Сессий"
              value={String(reactionData.reduce((sum, point) => sum + point.count, 0))}
            />
            <StatCard
              title="Среднее время"
              value={formatMetric(
                reactionData.length > 0
                  ? reactionData.reduce((sum, point) => sum + point.avgReactionMs * point.count, 0) /
                      reactionData.reduce((sum, point) => sum + point.count, 0)
                  : null,
                0,
                " мс"
              )}
            />
            <StatCard
              title="Точность"
              value={formatMetric(
                reactionData.length > 0
                  ? (reactionData.reduce((sum, point) => sum + point.accuracy * point.count, 0) /
                      reactionData.reduce((sum, point) => sum + point.count, 0)) *
                      100
                  : null,
                1,
                "%"
              )}
            />
            <StatCard
              title="Средний score"
              value={formatMetric(
                reactionData.length > 0
                  ? reactionData.reduce((sum, point) => sum + point.avgScore * point.count, 0) /
                      reactionData.reduce((sum, point) => sum + point.count, 0)
                  : null
              )}
            />
          </div>
        </section>
      ) : null}

      {mode === "n_back" ? (
        <section className="setup-block stats-flow-details" data-testid="stats-nback-summary">
          <h3>N-Back Lite: итоги</h3>
          <div className="stats-grid compact">
            <StatCard
              title="Сессий"
              value={String(nBackData.reduce((sum, point) => sum + point.count, 0))}
            />
            <StatCard
              title="Точность"
              value={formatMetric(
                nBackData.length > 0
                  ? (nBackData.reduce((sum, point) => sum + point.accuracy * point.count, 0) /
                      nBackData.reduce((sum, point) => sum + point.count, 0)) *
                      100
                  : null,
                1,
                "%"
              )}
            />
            <StatCard
              title="Средний score"
              value={formatMetric(
                nBackData.length > 0
                  ? nBackData.reduce((sum, point) => sum + point.avgScore * point.count, 0) /
                      nBackData.reduce((sum, point) => sum + point.count, 0)
                  : null
              )}
            />
            <StatCard
              title="Средний темп"
              value={formatMetric(
                nBackData.length > 0
                  ? nBackData.reduce((sum, point) => sum + point.speed * point.count, 0) /
                      nBackData.reduce((sum, point) => sum + point.count, 0)
                  : null
              )}
            />
          </div>
        </section>
      ) : null}

      {mode === "memory_grid" ? (
        <section className="setup-block stats-flow-details" data-testid="stats-memory-grid-summary">
          <h3>Memory Grid: итоги</h3>
          <div className="stats-grid compact">
            <StatCard
              title="Сессий"
              value={String(memoryGridData.reduce((sum, point) => sum + point.count, 0))}
            />
            <StatCard
              title="Точность"
              value={formatMetric(
                memoryGridData.length > 0
                  ? (memoryGridData.reduce((sum, point) => sum + point.accuracy * point.count, 0) /
                      memoryGridData.reduce((sum, point) => sum + point.count, 0)) *
                      100
                  : null,
                1,
                "%"
              )}
            />
            <StatCard
              title="Средний score"
              value={formatMetric(
                memoryGridData.length > 0
                  ? memoryGridData.reduce((sum, point) => sum + point.avgScore * point.count, 0) /
                      memoryGridData.reduce((sum, point) => sum + point.count, 0)
                  : null
              )}
            />
            <StatCard
              title="Среднее время воспроизведения"
              value={formatMetric(
                memoryGridData.length > 0
                  ? memoryGridData.reduce(
                      (sum, point) => sum + point.avgRecallTimeMs * point.count,
                      0
                    ) / memoryGridData.reduce((sum, point) => sum + point.count, 0)
                  : null,
                0,
                " мс"
              )}
            />
          </div>
        </section>
      ) : null}

      {mode === "decision_rush" ? (
        <section className="setup-block stats-flow-details" data-testid="stats-decision-rush-summary">
          <h3>Decision Rush: итоги</h3>
          <div className="stats-grid compact">
            <StatCard
              title="Сессий"
              value={String(decisionData.reduce((sum, point) => sum + point.count, 0))}
            />
            <StatCard
              title="Точность"
              value={formatMetric(
                decisionData.length > 0
                  ? (decisionData.reduce((sum, point) => sum + point.accuracy * point.count, 0) /
                      decisionData.reduce((sum, point) => sum + point.count, 0)) *
                      100
                  : null,
                1,
                "%"
              )}
            />
            <StatCard
              title="Средний score"
              value={formatMetric(
                decisionData.length > 0
                  ? decisionData.reduce((sum, point) => sum + point.avgScore * point.count, 0) /
                      decisionData.reduce((sum, point) => sum + point.count, 0)
                  : null
              )}
            />
            <StatCard
              title="P90"
              value={formatMetric(
                decisionData.length > 0
                  ? decisionData.reduce((sum, point) => sum + point.reactionP90Ms * point.count, 0) /
                      decisionData.reduce((sum, point) => sum + point.count, 0)
                  : null,
                0,
                " мс"
              )}
            />
          </div>
        </section>
      ) : null}

      {mode === "sprint_math" ? (
        <section className="setup-block stats-flow-details" data-testid="stats-sprint-summary">
          <h3>Sprint Math: {sprintFilterLabel(sprintFilter)}</h3>
          <div className="stats-grid compact">
            <StatCard title="Сессий" value={String(sprintSummary.sessions)} />
            <StatCard title="Задач/мин" value={formatMetric(sprintSummary.avgThroughput)} />
            <StatCard
              title="Точность"
              value={formatMetric(sprintSummary.avgAccuracyPct, 1, "%")}
            />
            <StatCard title="Средний score" value={formatMetric(sprintSummary.avgScore)} />
          </div>
        </section>
      ) : null}

      {mode === "sprint_math" ? (
        <section className="setup-block stats-flow-details" data-testid="stats-sprint-comparison">
          <h3>Сравнение подрежимов</h3>
          <div className="comparison-grid sprint-compare-grid">
            <article className="stat-card sprint-mode-card" data-testid="stats-sprint-card-add-sub">
              <p className="stat-card-title">Add/Sub</p>
              <p className="sprint-mode-line">Сессий: {sprintComparison.addSub.sessions}</p>
              <p className="sprint-mode-line">
                Задач/мин: {formatMetric(sprintComparison.addSub.avgThroughput)}
              </p>
              <p className="sprint-mode-line">
                Точность: {formatMetric(sprintComparison.addSub.avgAccuracyPct, 1, "%")}
              </p>
              <p className="sprint-mode-line">Score: {formatMetric(sprintComparison.addSub.avgScore)}</p>
            </article>

            <article className="stat-card sprint-mode-card" data-testid="stats-sprint-card-mixed">
              <p className="stat-card-title">Mixed</p>
              <p className="sprint-mode-line">Сессий: {sprintComparison.mixed.sessions}</p>
              <p className="sprint-mode-line">
                Задач/мин: {formatMetric(sprintComparison.mixed.avgThroughput)}
              </p>
              <p className="sprint-mode-line">
                Точность: {formatMetric(sprintComparison.mixed.avgAccuracyPct, 1, "%")}
              </p>
              <p className="sprint-mode-line">Score: {formatMetric(sprintComparison.mixed.avgScore)}</p>
            </article>
          </div>

          <p className="comparison-note" data-testid="stats-sprint-best-mode">
            {sprintComparison.bestMode
              ? `Сильнее сейчас: ${sprintSubmodeLabel(sprintComparison.bestMode)}`
              : "Недостаточно данных: выполните хотя бы одну сессию в Add/Sub или Mixed."}
          </p>

          <div className="stats-grid compact" data-testid="stats-sprint-delta-grid">
            <StatCard
              title="Delta темп (Add/Sub - Mixed)"
              value={formatSignedMetric(sprintComparison.throughputDelta)}
            />
            <StatCard
              title="Delta точность (Add/Sub - Mixed)"
              value={formatSignedMetric(sprintComparison.accuracyDeltaPct, 1, "%")}
            />
            <StatCard
              title="Delta score (Add/Sub - Mixed)"
              value={formatSignedMetric(sprintComparison.scoreDelta)}
            />
            <StatCard
              title="Готовность сравнения"
              value={sprintComparison.ready ? "Да" : "Нужно больше данных"}
            />
          </div>
        </section>
      ) : null}

      <section className="setup-block stats-secondary-block stats-compare-details" data-testid="stats-compare-band">
        <h3>Подробный график сравнения</h3>
        <p className="comparison-note">Подробный диапазон и график по другим пользователям для выбранного режима.</p>

        {!compareEnabled ? (
          <p className="status-line">Включите режим сравнения, чтобы увидеть диапазон результатов по другим пользователям.</p>
        ) : compareLoading ? (
          <p>Загрузка режима сравнения...</p>
        ) : compareChartData.length === 0 ? (
          <p>Недостаточно данных для сравнения в выбранном режиме.</p>
        ) : (
          <>
            <div className="stats-grid compact" data-testid="stats-compare-summary">
              <StatCard
                title="Вы (последний день)"
                value={formatMetric(
                  compareLatestPoint?.me ?? null,
                  compareConfig.digits,
                  compareConfig.metricSuffix
                )}
              />
              <StatCard
                title="Нижняя граница группы"
                value={formatMetric(
                  compareLatestPoint?.p25 ?? null,
                  compareConfig.digits,
                  compareConfig.metricSuffix
                )}
              />
              <StatCard
                title="Медиана"
                value={formatMetric(
                  compareLatestPoint?.median ?? null,
                  compareConfig.digits,
                  compareConfig.metricSuffix
                )}
              />
              <StatCard
                title="Верхняя граница группы"
                value={formatMetric(
                  compareLatestPoint?.p75 ?? null,
                  compareConfig.digits,
                  compareConfig.metricSuffix
                )}
              />
            </div>

            <div className="chart-box" data-testid="stats-compare-chart">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={compareChartData}>
                  <XAxis dataKey="dateShort" />
                  <YAxis />
                  <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""} />
                  <Line
                    type="monotone"
                    dataKey="me"
                    name="Вы"
                    stroke="#1e7f71"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="p25"
                    name="Нижняя граница"
                    stroke="#2e62c9"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="median"
                    name="Медиана"
                    stroke="#f2a93b"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="p75"
                    name="Верхняя граница"
                    stroke="#b74343"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </section>

      {loading ? <p>Загрузка статистики...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {isEmpty ? (
        <p>Пока нет данных для выбранного режима.</p>
      ) : (
        <div className="setup-block stats-chart-primary" data-testid="stats-main-chart">
          <p className="stats-section-kicker">Главный график</p>
          <h3>Как меняется результат по времени</h3>
          <p className="status-line">Сначала посмотрите тренд, потом при необходимости меняйте период и режим.</p>
          <div className="segmented-row chart-window-row" data-testid="stats-chart-window">
            <span className="status-line">Период графика:</span>
            <button
              type="button"
              className={chartRange === 7 ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() => setChartRange(7)}
              data-testid="stats-chart-window-7"
            >
              7 дн.
            </button>
            <button
              type="button"
              className={chartRange === 30 ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() => setChartRange(30)}
              data-testid="stats-chart-window-30"
            >
              30 дн.
            </button>
            <button
              type="button"
              className={chartRange === 90 ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() => setChartRange(90)}
              data-testid="stats-chart-window-90"
            >
              90 дн.
            </button>
            <button
              type="button"
              className={chartRange === "all" ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() => setChartRange("all")}
              data-testid="stats-chart-window-all"
            >
              Всё время
            </button>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={320}>
            {mode === "classic" ? (
              <LineChart data={visibleClassicChartData}>
                <XAxis dataKey="dateShort" />
                <YAxis />
                <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""} />
                <Line
                  type="monotone"
                  dataKey="bestSec"
                  name="Лучшее время (сек)"
                  stroke="#1e7f71"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgSec"
                  name="Среднее время (сек)"
                  stroke="#f2a93b"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            ) : mode === "timed" ? (
              <LineChart data={visibleTimedChartData}>
                <XAxis dataKey="dateShort" />
                <YAxis />
                <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""} />
                <Line
                  type="monotone"
                  dataKey="effectivePerMinute"
                  name="Эффективные / мин"
                  stroke="#1e7f71"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  name="Средний score"
                  stroke="#f2a93b"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            ) : mode === "reaction" ? (
              <LineChart data={visibleReactionChartData}>
                <XAxis dataKey="dateShort" />
                <YAxis />
                <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""} />
                <Line
                  type="monotone"
                  dataKey="bestReactionMs"
                  name="Лучшее время (мс)"
                  stroke="#1e7f71"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgReactionMs"
                  name="Среднее время (мс)"
                  stroke="#f2a93b"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="accuracyPct"
                  name="Точность (%)"
                  stroke="#2e62c9"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            ) : mode === "n_back" ? (
              <LineChart data={visibleNBackChartData}>
                <XAxis dataKey="dateShort" />
                <YAxis />
                <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""} />
                <Line
                  type="monotone"
                  dataKey="accuracyPct"
                  name="Точность (%)"
                  stroke="#1e7f71"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  name="Средний score"
                  stroke="#f2a93b"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            ) : mode === "memory_grid" ? (
              <LineChart data={visibleMemoryGridChartData}>
                <XAxis dataKey="dateShort" />
                <YAxis />
                <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""} />
                <Line
                  type="monotone"
                  dataKey="accuracyPct"
                  name="Точность (%)"
                  stroke="#1e7f71"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  name="Средний score"
                  stroke="#f2a93b"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgRecallTimeMs"
                  name="Время воспроизведения (мс)"
                  stroke="#2e62c9"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            ) : mode === "decision_rush" ? (
              <LineChart data={visibleDecisionChartData}>
                <XAxis dataKey="dateShort" />
                <YAxis />
                <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""} />
                <Line
                  type="monotone"
                  dataKey="accuracyPct"
                  name="Точность (%)"
                  stroke="#1e7f71"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  name="Средний score"
                  stroke="#f2a93b"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="reactionP90Ms"
                  name="P90 (мс)"
                  stroke="#2e62c9"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            ) : (
              <LineChart data={visibleSprintMathChartData}>
                <XAxis dataKey="dateShort" />
                <YAxis />
                <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""} />
                <Line
                  type="monotone"
                  dataKey="throughput"
                  name="Задач/мин"
                  stroke="#1e7f71"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="accuracyPct"
                  name="Точность (%)"
                  stroke="#2e62c9"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  name="Средний score"
                  stroke="#f2a93b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
















