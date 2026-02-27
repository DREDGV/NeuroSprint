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
import { sessionRepository } from "../entities/session/sessionRepository";
import { StatCard } from "../shared/ui/StatCard";
import type {
  ClassicDailyPoint,
  SprintMathDailyPoint,
  TimedDailyPoint
} from "../shared/types/domain";

type StatsMode = "classic" | "timed" | "sprint_math";
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

function formatDateShort(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) {
    return dateKey;
  }
  return `${day}.${month}`;
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
  return mode === "sprint_add_sub" ? "Add/Sub" : "Mixed";
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
    return "Add/Sub";
  }
  if (filter === "sprint_mixed") {
    return "Mixed";
  }
  return "Все";
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

export function StatsPage() {
  const { activeUserId } = useActiveUser();
  const access = useRoleAccess();
  const canViewGroupStatsAccess = access.stats.viewGroup;
  const [mode, setMode] = useState<StatsMode>("classic");
  const [sprintFilter, setSprintFilter] = useState<SprintModeFilter>("all");
  const [classicData, setClassicData] = useState<ClassicDailyPoint[]>([]);
  const [timedData, setTimedData] = useState<TimedDailyPoint[]>([]);
  const [sprintAllData, setSprintAllData] = useState<SprintMathDailyPoint[]>([]);
  const [sprintAddSubData, setSprintAddSubData] = useState<SprintMathDailyPoint[]>([]);
  const [sprintMixedData, setSprintMixedData] = useState<SprintMathDailyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeUserId) {
      setClassicData([]);
      setTimedData([]);
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
      sessionRepository.aggregateDailySprintMath(activeUserId),
      sessionRepository.aggregateDailyByModeId(activeUserId, "sprint_add_sub"),
      sessionRepository.aggregateDailyByModeId(activeUserId, "sprint_mixed")
    ])
      .then(([classic, timed, sprintAll, sprintAddSub, sprintMixed]) => {
        if (cancelled) {
          return;
        }
        setClassicData(classic);
        setTimedData(timed);
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
  }, [classicChartData, mode, sprintMathChartData, timedChartData]);

  const isEmpty = useMemo(() => {
    if (mode === "classic") {
      return classicChartData.length === 0;
    }
    if (mode === "timed") {
      return timedChartData.length === 0;
    }
    return sprintMathChartData.length === 0;
  }, [classicChartData.length, mode, sprintMathChartData.length, timedChartData.length]);

  return (
    <section className="panel" data-testid="stats-page">
      <h2>Статистика по дням</h2>
      <p>
        Базовый экран прогресса: понятные графики по режимам и быстрый переход к
        расширенной аналитике.
      </p>

      <div className="segmented-row">
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

      <div className="segmented-row">
        <button
          type="button"
          className={mode === "classic" ? "btn-secondary is-active" : "btn-secondary"}
          onClick={() => setMode("classic")}
          data-testid="stats-mode-classic"
        >
          Classic / Reverse
        </button>
        <button
          type="button"
          className={mode === "timed" ? "btn-secondary is-active" : "btn-secondary"}
          onClick={() => setMode("timed")}
          data-testid="stats-mode-timed"
        >
          Timed
        </button>
        <button
          type="button"
          className={mode === "sprint_math" ? "btn-secondary is-active" : "btn-secondary"}
          onClick={() => setMode("sprint_math")}
          data-testid="stats-mode-sprint"
        >
          Sprint Math
        </button>
      </div>

      {mode === "sprint_math" ? (
        <div className="segmented-row" data-testid="stats-sprint-filter-row">
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
            Add/Sub
          </button>
          <button
            type="button"
            className={sprintFilter === "sprint_mixed" ? "btn-secondary is-active" : "btn-secondary"}
            onClick={() => setSprintFilter("sprint_mixed")}
            data-testid="stats-sprint-filter-mixed"
          >
            Mixed
          </button>
        </div>
      ) : null}

      <section className="setup-block" data-testid="stats-progress-headline">
        <h3>Прогресс за период</h3>
        <p className="status-line">{progressInsight.headline}</p>
        <div className="stats-grid compact">
          <StatCard
            title="Прошлый период"
            value={formatMetric(progressInsight.previousAvg)}
          />
          <StatCard
            title="Текущий период"
            value={formatMetric(progressInsight.currentAvg)}
          />
          <StatCard
            title="Изменение"
            value={formatSignedMetric(progressInsight.changePct, 1, "%")}
          />
          <StatCard
            title="Личный рекорд"
            value={progressInsight.snapshot?.label ?? "-"}
          />
        </div>
        {progressInsight.snapshot ? (
          <p className="status-line">Дата рекорда: {progressInsight.snapshot.date}</p>
        ) : (
          <p className="status-line">Личный рекорд появится после первых сессий.</p>
        )}
      </section>

      {mode === "sprint_math" ? (
        <section className="setup-block" data-testid="stats-sprint-summary">
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
        <section className="setup-block" data-testid="stats-sprint-comparison">
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

      {loading ? <p>Загрузка статистики...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {isEmpty ? (
        <p>Пока нет данных для выбранного режима.</p>
      ) : (
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={320}>
            {mode === "classic" ? (
              <LineChart data={classicChartData}>
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
              <LineChart data={timedChartData}>
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
            ) : (
              <LineChart data={sprintMathChartData}>
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
      )}
    </section>
  );
}
