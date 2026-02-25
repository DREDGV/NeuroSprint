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
import { useAppRole } from "../app/useAppRole";
import { sessionRepository } from "../entities/session/sessionRepository";
import { canViewGroupStats } from "../shared/lib/auth/permissions";
import { StatCard } from "../shared/ui/StatCard";
import type {
  ClassicDailyPoint,
  SprintMathDailyPoint,
  TimedDailyPoint
} from "../shared/types/domain";

type StatsMode = "classic" | "timed" | "sprint_math";
type SprintModeFilter = "all" | "sprint_add_sub" | "sprint_mixed";

interface SprintSummary {
  sessions: number;
  avgThroughput: number | null;
  avgAccuracyPct: number | null;
  avgScore: number | null;
}

function formatDateShort(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) {
    return dateKey;
  }
  return `${day}.${month}`;
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

export function StatsPage() {
  const { activeUserId } = useActiveUser();
  const appRole = useAppRole();
  const canViewGroupStatsAccess = canViewGroupStats(appRole);
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
        Базовый экран прогресса: понятные графики по режимам и быстрый переход к расширенной
        аналитике.
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

      {mode === "sprint_math" ? (
        <section className="setup-block" data-testid="stats-sprint-summary">
          <h3>Sprint Math: {sprintFilterLabel(sprintFilter)}</h3>
          <div className="stats-grid compact">
            <StatCard title="Сессий" value={String(sprintSummary.sessions)} />
            <StatCard
              title="Задач/мин"
              value={sprintSummary.avgThroughput != null ? sprintSummary.avgThroughput.toFixed(2) : "—"}
            />
            <StatCard
              title="Точность"
              value={
                sprintSummary.avgAccuracyPct != null
                  ? `${sprintSummary.avgAccuracyPct.toFixed(1)}%`
                  : "—"
              }
            />
            <StatCard
              title="Средний score"
              value={sprintSummary.avgScore != null ? sprintSummary.avgScore.toFixed(2) : "—"}
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
