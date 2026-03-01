import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import {
  dailyChallengeRepository,
  listUpcomingDailyChallengeModes
} from "../entities/challenge/dailyChallengeRepository";
import { sessionRepository } from "../entities/session/sessionRepository";
import { formatSecondsFromMs, toLocalDateKey } from "../shared/lib/date/date";
import {
  buildDailyMiniGoals,
  resolveNextStreakBadge,
  resolveStreakBadge
} from "../shared/lib/motivation/motivation";
import { getSettings } from "../shared/lib/settings/settings";
import { StatCard } from "../shared/ui/StatCard";
import type { DailyChallengeProgress, DailyProgressSummary } from "../shared/types/domain";

function toShortDateLabel(localDate: string): string {
  const [year, month, day] = localDate
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  const value = new Date(year, (month || 1) - 1, day || 1);
  return value.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function toRelativeChallengeDayLabel(localDate: string): string {
  const today = toLocalDateKey(new Date());
  const tomorrow = toLocalDateKey(new Date(Date.now() + 86_400_000));
  if (localDate === today) {
    return "Сегодня";
  }
  if (localDate === tomorrow) {
    return "Завтра";
  }
  return toShortDateLabel(localDate);
}

export function HomePage() {
  const { activeUserId, activeUserName } = useActiveUserDisplayName();
  const settings = getSettings();
  const dailyGoalSessions = settings.dailyGoalSessions;
  const [dailySummary, setDailySummary] = useState<DailyProgressSummary | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallengeProgress | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(false);

  useEffect(() => {
    if (!activeUserId) {
      setDailySummary(null);
      setDailyChallenge(null);
      setStreakDays(0);
      setChallengeLoading(false);
      return;
    }

    let cancelled = false;
    setSummaryLoading(true);
    setChallengeLoading(true);

    void Promise.allSettled([
      sessionRepository.getDailyProgressSummary(activeUserId),
      sessionRepository.getIndividualInsights(activeUserId),
      dailyChallengeRepository.getOrCreateForToday(activeUserId)
    ])
      .then(([summaryResult, insightsResult, challengeResult]) => {
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

        if (challengeResult.status === "fulfilled") {
          setDailyChallenge(challengeResult.value);
        } else {
          setDailyChallenge(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSummaryLoading(false);
          setChallengeLoading(false);
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
  const challengeSchedule = useMemo(() => {
    if (!dailyChallenge) {
      return [];
    }
    return listUpcomingDailyChallengeModes(dailyChallenge.challenge.localDate, 3);
  }, [dailyChallenge]);

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
          {summaryLoading
            ? "Считаем статистику..."
            : `Сессии: ${progressValue} / ${dailyGoalSessions}`}
        </p>

        <div className="stats-grid compact">
          <StatCard
            title="Лучший Classic"
            value={
              dailySummary?.bestClassicDurationMs != null
                ? formatSecondsFromMs(dailySummary.bestClassicDurationMs)
                : "-"
            }
          />
          <StatCard
            title="Лучший Timed"
            value={
              dailySummary?.bestTimedScore != null
                ? dailySummary.bestTimedScore.toFixed(1)
                : "-"
            }
          />
          <StatCard
            title="Средняя точность"
            value={
              dailySummary?.avgAccuracy != null
                ? `${(dailySummary.avgAccuracy * 100).toFixed(1)}%`
                : "-"
            }
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
            До бейджа «{nextBadge.title}» осталось
            {" "}
            {Math.max(0, nextBadge.minDays - streakDays)}
            {" "}
            дн.
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

      <section className="challenge-card" data-testid="home-daily-challenge">
        <div className="challenge-headline">
          <h3>Challenge дня</h3>
          {dailyChallenge ? (
            <span
              className={
                dailyChallenge.completed
                  ? "challenge-status is-complete"
                  : "challenge-status"
              }
            >
              {dailyChallenge.completed ? "Выполнено" : "В процессе"}
            </span>
          ) : null}
        </div>
        {challengeLoading ? (
          <p className="status-line">Готовим challenge...</p>
        ) : dailyChallenge ? (
          <>
            <p className="challenge-title">{dailyChallenge.challenge.title}</p>
            <p className="status-line">{dailyChallenge.challenge.description}</p>
            <p className="challenge-progress">Прогресс: {dailyChallenge.progressLabel}</p>
            <div className="challenge-explanation" data-testid="home-daily-challenge-explanation">
              <p className="status-line challenge-note">
                В challenge дня доступен один режим. Каждый день режим меняется автоматически.
              </p>
              <ul className="challenge-schedule-list">
                {challengeSchedule.map((entry) => (
                  <li
                    key={entry.localDate}
                    className={
                      entry.localDate === dailyChallenge.challenge.localDate
                        ? "challenge-schedule-item is-today"
                        : "challenge-schedule-item"
                    }
                  >
                    <span className="challenge-schedule-day">
                      {toRelativeChallengeDayLabel(entry.localDate)}
                    </span>
                    <span className="challenge-schedule-mode">{entry.modeTitle}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="action-row">
              <Link
                className={dailyChallenge.completed ? "btn-secondary" : "btn-primary"}
                to={dailyChallenge.launchPath}
                data-testid="home-daily-challenge-start"
              >
                {dailyChallenge.completed ? "Повторить challenge" : "Принять challenge"}
              </Link>
            </div>
          </>
        ) : (
          <p className="status-line">
            Выберите активный профиль, чтобы получить challenge дня.
          </p>
        )}
      </section>

      <section className="setup-block" data-testid="home-quick-start">
        <h3>Быстрый старт</h3>
        <p className="status-line">Запуск тренировки сразу в setup, без промежуточных шагов.</p>
        <div className="action-row">
          <Link
            className="btn-primary"
            to="/training/schulte?mode=classic_plus"
            data-testid="home-start-classic"
          >
            Начать Classic
          </Link>
          <Link
            className="btn-secondary"
            to="/training/sprint-math?mode=sprint_add_sub"
            data-testid="home-start-sprint"
          >
            Начать Sprint Math
          </Link>
          <Link
            className="btn-ghost"
            to="/training/reaction?mode=reaction_signal"
            data-testid="home-start-reaction"
          >
            Начать Reaction
          </Link>
        </div>
      </section>

      <section className="setup-block" data-testid="home-planned-start">
        <h3>План дня</h3>
        <p className="status-line">
          Если нужна рекомендация режима и цель на сегодня, откройте предтренировочный экран.
        </p>
        <div className="action-row">
          <Link className="btn-secondary" to="/training/pre-session" data-testid="home-open-pre-session">
            Открыть план дня
          </Link>
          <Link className="btn-ghost" to="/training" data-testid="home-open-training-hub">
            Выбрать модуль вручную
          </Link>
        </div>
      </section>
    </section>
  );
}
