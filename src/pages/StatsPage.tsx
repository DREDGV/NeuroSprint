import { useEffect, useMemo, useState } from "react";
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
import type { ClassicDailyPoint, Mode, TimedDailyPoint } from "../shared/types/domain";

export function StatsPage() {
  const { activeUserId } = useActiveUser();
  const [mode, setMode] = useState<Mode>("classic");
  const [classicData, setClassicData] = useState<ClassicDailyPoint[]>([]);
  const [timedData, setTimedData] = useState<TimedDailyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeUserId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all([
      sessionRepository.aggregateDailyClassic(activeUserId),
      sessionRepository.aggregateDailyTimed(activeUserId)
    ])
      .then(([classic, timed]) => {
        if (cancelled) {
          return;
        }
        setClassicData(classic);
        setTimedData(timed);
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
        bestSec: Number((entry.bestDurationMs / 1000).toFixed(2)),
        avgSec: Number((entry.avgDurationMs / 1000).toFixed(2))
      })),
    [classicData]
  );

  const timedChartData = useMemo(
    () =>
      timedData.map((entry) => ({
        date: entry.date,
        effectivePerMinute: Number(entry.effectivePerMinute.toFixed(2)),
        avgScore: Number(entry.avgScore.toFixed(2))
      })),
    [timedData]
  );

  const isEmpty =
    mode === "classic" ? classicChartData.length === 0 : timedChartData.length === 0;

  return (
    <section className="panel" data-testid="stats-page">
      <h2>Статистика по дням</h2>
      <p>
        Группировка данных по локальной дате в формате <code>YYYY-MM-DD</code>.
      </p>

      <div className="segmented-row">
        <button
          type="button"
          className={mode === "classic" ? "btn-secondary is-active" : "btn-secondary"}
          onClick={() => setMode("classic")}
        >
          Classic
        </button>
        <button
          type="button"
          className={mode === "timed" ? "btn-secondary is-active" : "btn-secondary"}
          onClick={() => setMode("timed")}
        >
          Timed
        </button>
      </div>

      {loading ? <p>Загрузка статистики...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {isEmpty ? (
        <p>Пока нет данных для выбранного режима.</p>
      ) : (
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={320}>
            {mode === "classic" ? (
              <LineChart data={classicChartData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
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
            ) : (
              <LineChart data={timedChartData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="effectivePerMinute"
                  name="effectiveCorrect / мин"
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
            )}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

