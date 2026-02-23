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
import { trainingRepository } from "../entities/training/trainingRepository";
import { SCHULTE_MODES } from "../shared/lib/training/presets";
import { StatCard } from "../shared/ui/StatCard";
import type {
  ClassicDailyPoint,
  ModeRecommendation,
  TimedDailyPoint,
  TrainingModeId,
  UserModeProfile
} from "../shared/types/domain";

function calculateStability(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function StatsIndividualPage() {
  const { activeUserId } = useActiveUser();
  const [modeId, setModeId] = useState<TrainingModeId>("classic_plus");
  const [dailyClassic, setDailyClassic] = useState<ClassicDailyPoint[]>([]);
  const [dailyTimed, setDailyTimed] = useState<TimedDailyPoint[]>([]);
  const [profiles, setProfiles] = useState<UserModeProfile[]>([]);
  const [recommendation, setRecommendation] = useState<ModeRecommendation | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [currentWeekAvgScore, setCurrentWeekAvgScore] = useState<number | null>(null);
  const [previousWeekAvgScore, setPreviousWeekAvgScore] = useState<number | null>(null);
  const [accuracyStability, setAccuracyStability] = useState<number | null>(null);
  const [levelTrend, setLevelTrend] = useState<Array<{ date: string; avgLevel: number }>>([]);
  const [loading, setLoading] = useState(false);
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
        const [daily, insights, modeProfiles, sessions] = await Promise.all([
          sessionRepository.aggregateDailyByModeId(activeUserId, modeId),
          sessionRepository.getIndividualInsights(activeUserId),
          trainingRepository.listUserModeProfiles(activeUserId),
          trainingRepository.listRecentSessionsByMode(activeUserId, "schulte", modeId, 30)
        ]);

        if (cancelled) {
          return;
        }

        if (modeId === "timed_plus") {
          setDailyTimed(daily as TimedDailyPoint[]);
          setDailyClassic([]);
        } else {
          setDailyClassic(daily as ClassicDailyPoint[]);
          setDailyTimed([]);
        }

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
  }, [activeUserId, modeId]);

  const selectedMode = useMemo(
    () => SCHULTE_MODES.find((entry) => entry.id === modeId) ?? SCHULTE_MODES[0],
    [modeId]
  );

  const selectedProfileLevel = useMemo(() => {
    const profile = profiles.find((entry) => entry.modeId === modeId);
    if (!profile) {
      return "—";
    }
    return String(profile.autoAdjust ? profile.level : profile.manualLevel ?? profile.level);
  }, [modeId, profiles]);

  const chartData = useMemo(() => {
    if (modeId === "timed_plus") {
      return dailyTimed.map((entry) => ({
        date: entry.date,
        valueA: Number(entry.effectivePerMinute.toFixed(2)),
        valueB: Number(entry.avgScore.toFixed(2)),
        nameA: "effectiveCorrect / мин",
        nameB: "Средний score"
      }));
    }
    return dailyClassic.map((entry) => ({
      date: entry.date,
      valueA: Number((entry.bestDurationMs / 1000).toFixed(2)),
      valueB: Number((entry.avgDurationMs / 1000).toFixed(2)),
      nameA: "Лучшее время (сек)",
      nameB: "Среднее время (сек)"
    }));
  }, [dailyClassic, dailyTimed, modeId]);

  return (
    <section className="panel" data-testid="stats-individual-page">
      <h2>Индивидуальная статистика</h2>
      <p>Текущие достижения, тренд сложности и рекомендации на сегодня.</p>

      <div className="segmented-row">
        <Link className="btn-secondary is-active" to="/stats/individual">
          Индивидуальная
        </Link>
        <Link className="btn-secondary" to="/stats/group">
          Группа
        </Link>
      </div>

      <div className="segmented-row">
        {SCHULTE_MODES.map((mode) => (
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
        <StatCard title="Streak (дней)" value={String(streakDays)} />
        <StatCard
          title="Стабильность точности"
          value={accuracyStability != null ? accuracyStability.toFixed(3) : "—"}
        />
        <StatCard
          title="Текущая неделя"
          value={currentWeekAvgScore != null ? currentWeekAvgScore.toFixed(2) : "—"}
        />
        <StatCard
          title="Прошлая неделя"
          value={previousWeekAvgScore != null ? previousWeekAvgScore.toFixed(2) : "—"}
        />
      </div>

      {recommendation ? (
        <p className="status-line">
          Рекомендованный режим:{" "}
          {SCHULTE_MODES.find((entry) => entry.id === recommendation.modeId)?.title}.{" "}
          {recommendation.reason}
        </p>
      ) : null}

      {loading ? <p>Загрузка статистики...</p> : null}
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
                stroke="#1e7f71"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="valueB"
                stroke="#f2a93b"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
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
