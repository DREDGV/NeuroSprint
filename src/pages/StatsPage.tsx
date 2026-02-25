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
import { sessionRepository } from "../entities/session/sessionRepository";
import type {
  ClassicDailyPoint,
  Mode,
  SprintMathDailyPoint,
  TimedDailyPoint
} from "../shared/types/domain";

function formatDateShort(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) {
    return dateKey;
  }
  return `${day}.${month}`;
}

export function StatsPage() {
  const { activeUserId } = useActiveUser();
  const [mode, setMode] = useState<Mode>("classic");
  const [classicData, setClassicData] = useState<ClassicDailyPoint[]>([]);
  const [timedData, setTimedData] = useState<TimedDailyPoint[]>([]);
  const [sprintMathData, setSprintMathData] = useState<SprintMathDailyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeUserId) {
      setClassicData([]);
      setTimedData([]);
      setSprintMathData([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all([
      sessionRepository.aggregateDailyClassic(activeUserId),
      sessionRepository.aggregateDailyTimed(activeUserId),
      sessionRepository.aggregateDailySprintMath(activeUserId)
    ])
      .then(([classic, timed, sprintMath]) => {
        if (cancelled) {
          return;
        }
        setClassicData(classic);
        setTimedData(timed);
        setSprintMathData(sprintMath);
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
      sprintMathData.map((entry) => ({
        date: entry.date,
        dateShort: formatDateShort(entry.date),
        throughput: Number(entry.throughput.toFixed(2)),
        accuracyPct: Number((entry.accuracy * 100).toFixed(2)),
        avgScore: Number(entry.avgScore.toFixed(2))
      })),
    [sprintMathData]
  );

  const isEmpty = useMemo(() => {
    if (mode === "classic" || mode === "reverse") {
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
        Базовый экран прогресса: минимум переключателей, понятные графики и быстрый
        переход к расширенной аналитике.
      </p>

      <div className="segmented-row">
        <Link className="btn-secondary is-active" to="/stats">
          Простая
        </Link>
        <Link className="btn-secondary" to="/stats/individual">
          Расширенная
        </Link>
        <Link className="btn-secondary" to="/stats/group">
          Группа
        </Link>
      </div>

      <div className="segmented-row">
        <button
          type="button"
          className={mode === "classic" || mode === "reverse" ? "btn-secondary is-active" : "btn-secondary"}
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

      {loading ? <p>Загрузка статистики...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {isEmpty ? (
        <p>Пока нет данных для выбранного режима.</p>
      ) : (
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={320}>
            {mode === "classic" || mode === "reverse" ? (
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
