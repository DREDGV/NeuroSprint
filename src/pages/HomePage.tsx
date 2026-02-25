import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import { sessionRepository } from "../entities/session/sessionRepository";
import { formatSecondsFromMs } from "../shared/lib/date/date";
import {
  buildDailyMiniGoals,
  resolveNextStreakBadge,
  resolveStreakBadge
} from "../shared/lib/motivation/motivation";
import { getSettings } from "../shared/lib/settings/settings";
import { StatCard } from "../shared/ui/StatCard";
import type { DailyProgressSummary } from "../shared/types/domain";

export function HomePage() {
  const { activeUserId, activeUserName } = useActiveUserDisplayName();
  const settings = getSettings();
  const dailyGoalSessions = settings.dailyGoalSessions;
  const [dailySummary, setDailySummary] = useState<DailyProgressSummary | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    if (!activeUserId) {
      setDailySummary(null);
      setStreakDays(0);
      return;
    }

    let cancelled = false;
    setSummaryLoading(true);

    void Promise.allSettled([
      sessionRepository.getDailyProgressSummary(activeUserId),
      sessionRepository.getIndividualInsights(activeUserId)
    ])
      .then(([summaryResult, insightsResult]) => {
        if (cancelled) {
          return;
        }

        if (summaryResult.status === "fulfilled") {
          setDailySummary(summaryResult.value);
        } else {
          setDailySummary(null);
        }

        if (insightsResult.status === "fulfilled") {
          setStreakDays(insightsResult.value.streakDays);
        } else {
          setStreakDays(0);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  const progressValue = dailySummary?.sessionsTotal ?? 0;
  const progressPercent = Math.min(100, Math.round((progressValue / dailyGoalSessions) * 100));
  const streakBadge = resolveStreakBadge(streakDays);
  const nextBadge = resolveNextStreakBadge(streakDays);
  const miniGoals = useMemo(
    () => buildDailyMiniGoals({ streakDays, dailySummary, dailyGoalSessions }),
    [streakDays, dailySummary, dailyGoalSessions]
  );

  return (
    <section className="panel" data-testid="home-page">
      <h2>Главный экран</h2>
      <p>NeuroSprint помогает развивать скорость мышления, внимание и точность.</p>

      <section className="active-player-card" data-testid="home-active-player">
        <p className="active-player-label">Сейчас тренируется</p>
        <p className="active-player-name">{activeUserName}</p>
      </section>

      <section className="today-progress" data-testid="home-today-progress">
        <h3>Прогресс за сегодня</h3>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
        >
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="status-line">
          {summaryLoading ? "Считаем статистику..." : `Сессии: ${progressValue} / ${dailyGoalSessions}`}
        </p>

        <div className="stats-grid compact">
          <StatCard
            title="Лучший Classic"
            value={
              dailySummary?.bestClassicDurationMs != null
                ? formatSecondsFromMs(dailySummary.bestClassicDurationMs)
                : "—"
            }
          />
          <StatCard
            title="Лучший Timed"
            value={dailySummary?.bestTimedScore != null ? dailySummary.bestTimedScore.toFixed(1) : "—"}
          />
          <StatCard
            title="Средняя точность"
            value={dailySummary?.avgAccuracy != null ? `${(dailySummary.avgAccuracy * 100).toFixed(1)}%` : "—"}
          />
          <StatCard title="Сессий сегодня" value={String(dailySummary?.sessionsTotal ?? 0)} />
        </div>
      </section>

      <section className="motivation-card" data-testid="home-motivation">
        <h3>Мягкая мотивация</h3>
        <div className="streak-headline">
          <span className="streak-badge">{streakBadge.icon}</span>
          <div>
            <p className="status-line">
              Текущий бейдж: <strong>{streakBadge.title}</strong>
            </p>
            <p className="status-line">Серия дней: {streakDays}</p>
          </div>
        </div>
        {nextBadge ? (
          <p className="status-line">
            До бейджа «{nextBadge.title}» осталось {Math.max(0, nextBadge.minDays - streakDays)} дн.
          </p>
        ) : (
          <p className="status-line">Вы уже на максимальном бейдже серии.</p>
        )}

        <div className="mini-goals-list">
          {miniGoals.map((goal) => (
            <article
              key={goal.id}
              className={goal.completed ? "mini-goal-item is-complete" : "mini-goal-item"}
            >
              <h4>{goal.title}</h4>
              <p>{goal.description}</p>
              <p className="mini-goal-progress">{goal.progressLabel}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="action-row">
        <Link className="btn-primary" to="/training/pre-session?mode=classic_plus">
          Начать Classic
        </Link>
        <Link className="btn-secondary" to="/training/pre-session?mode=timed_plus">
          Начать Timed
        </Link>
        <Link className="btn-ghost" to="/training/pre-session?mode=reverse">
          Начать Reverse
        </Link>
      </div>
    </section>
  );
}
