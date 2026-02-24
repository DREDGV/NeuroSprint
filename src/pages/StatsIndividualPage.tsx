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
import { groupRepository } from "../entities/group/groupRepository";
import { sessionRepository } from "../entities/session/sessionRepository";
import { trainingRepository } from "../entities/training/trainingRepository";
import { userRepository } from "../entities/user/userRepository";
import { SCHULTE_MODES } from "../shared/lib/training/presets";
import { StatCard } from "../shared/ui/StatCard";
import type {
  ClassGroup,
  ClassicDailyPoint,
  GroupMetric,
  ModeRecommendation,
  TimedDailyPoint,
  TrainingModeId,
  User,
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

function metricTitle(metric: GroupMetric): string {
  if (metric === "accuracy") {
    return "Точность (%)";
  }
  if (metric === "speed") {
    return "Скорость";
  }
  return "Score";
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
        const [daily, insights, modeProfiles, sessions, loadedUsers, loadedGroups] =
          await Promise.all([
            sessionRepository.aggregateDailyByModeId(activeUserId, modeId),
            sessionRepository.getIndividualInsights(activeUserId),
            trainingRepository.listUserModeProfiles(activeUserId),
            trainingRepository.listRecentSessionsByMode(activeUserId, "schulte", modeId, 30),
            userRepository.list(),
            groupRepository.listGroupsForUser(activeUserId)
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

        setUsers(loadedUsers);
        setGroups(loadedGroups);

        const firstOtherUser = loadedUsers.find((entry) => entry.id !== activeUserId);
        if (!firstOtherUser) {
          setCompareUserId("");
        } else if (
          !compareUserId ||
          compareUserId === activeUserId ||
          !loadedUsers.some((entry) => entry.id === compareUserId)
        ) {
          setCompareUserId(firstOtherUser.id);
        }

        if (loadedGroups.length === 0) {
          setCompareGroupId("");
        } else if (!compareGroupId || !loadedGroups.some((entry) => entry.id === compareGroupId)) {
          setCompareGroupId(loadedGroups[0].id);
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
  }, [activeUserId, compareGroupId, compareUserId, modeId]);

  useEffect(() => {
    if (!activeUserId) {
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
  }, [activeUserId, compareGroupId, compareMetric, comparePeriod, compareUserId, modeId]);

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

      <section className="setup-block" data-testid="individual-comparison-block">
        <h3>Сравнение результатов</h3>
        <div className="settings-form">
          <label htmlFor="compare-metric">Метрика сравнения</label>
          <select
            id="compare-metric"
            value={compareMetric}
            onChange={(event) => setCompareMetric(event.target.value as GroupMetric)}
          >
            <option value="score">Score</option>
            <option value="accuracy">Accuracy</option>
            <option value="speed">Speed</option>
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
            <option value="all">Все время</option>
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
                {entry.name}
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

      {recommendation ? (
        <p className="status-line">
          Рекомендованный режим: {SCHULTE_MODES.find((entry) => entry.id === recommendation.modeId)?.title}.{" "}
          {recommendation.reason}
        </p>
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
