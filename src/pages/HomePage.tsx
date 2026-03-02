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

// SVG Icons
const FireIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M12 23c-4.97 0-9-3.58-9-8 0-2.52 1.56-5.12 3.5-6.94.36-.34.92-.32 1.26.04.34.36.32.92-.04 1.26C6.14 10.85 5 12.98 5 15c0 3.31 3.13 6 7 6s7-2.69 7-6c0-2.02-1.14-4.15-2.72-5.64-.36-.34-.38-.9-.04-1.26.34-.36.9-.38 1.26-.04C19.44 9.88 21 12.48 21 15c0 4.42-4.03 8-9 8zm0-10c-.55 0-1 .45-1 1 0 1.66-1.34 3-3 3-.55 0-1-.45-1-1s.45-1 1-1c.55 0 1-.45 1-1 0-2.21 1.79-4 4-4 .55 0 1 .45 1 1s-.45 1-1 1c-.55 0-1 .45-1 1z"/>
  </svg>
);

const LightningIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"/>
  </svg>
);

const TargetIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
  </svg>
);

const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1l0 0c0 2.21 1.79 4 4 4 .89 0 1.71-.29 2.38-.78C10.08 13.24 11.96 15 14 15v2H8v2h8v-2h-2v-2c2.04 0 3.92-1.76 4.62-3.78.67.49 1.49.78 2.38.78 2.21 0 4-1.79 4-4l0 0V7c0-1.1-.9-2-2-2zM7 12c-1.1 0-2-.9-2-2V7h2v5zm10 0V7h2v3c0 1.1-.9 2-2 2z"/>
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const ChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M3 13h2v8H3v-8zm4-6h2v14H7V7zm4-4h2v18h-2V3zm4 8h2v10h-2V11zm4-4h2v14h-2V7z"/>
  </svg>
);

const BrainIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
    <path d="M12 2C9 2 7 3.5 7 5.5c0 .5.1 1 .3 1.4C5.4 7.8 4 9.8 4 12c0 2.8 2 5 5 5.5V19c0 1.1.9 2 2 2s2-.9 2-2v-1.5c3-.5 5-2.7 5-5.5 0-2.2-1.4-4.2-3.3-5.1.2-.4.3-.9.3-1.4C17 3.5 15 2 12 2zm0 2c1.7 0 3 .9 3 2.5S13.7 9 12 9 9 8.1 9 6.5 10.3 4 12 4zm0 15c-.6 0-1-.4-1-1v-1.5c0-.6.4-1 1-1s1 .4 1 1V18c0 .6-.4 1-1 1zm3-4H9c-2.2 0-4-1.8-4-4 0-1.7 1.1-3.2 2.7-3.8.3.9.8 1.7 1.5 2.3-.3.5-.5 1.1-.5 1.7 0 1.7 1.3 3 3 3s3-1.3 3-3c0-.6-.2-1.2-.5-1.7.7-.6 1.2-1.4 1.5-2.3 1.6.6 2.7 2.1 2.7 3.8 0 2.2-1.8 4-4 4z"/>
  </svg>
);

const GridIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
    <path d="M4 4h7v7H4V4zm0 9h7v7H4v-7zm9-9h7v7h-7V4zm0 9h7v7h-7v-7z"/>
  </svg>
);

const MathIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
    <path d="M18 4H6v2l6.5 6L6 18v2h12v-3h-7l5-5-5-5h7z"/>
  </svg>
);

const SpeedIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/>
  </svg>
);

// Progress Ring Component
function ProgressRing({ progress, size = 120, strokeWidth = 8 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, progress) / 100) * circumference;

  return (
    <div className="progress-ring-wrapper" style={{ width: size, height: size }}>
      <svg className="progress-ring" width={size} height={size}>
        <circle
          className="progress-ring-bg"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="progress-ring-fill"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: `${circumference} ${circumference}`,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="progress-ring-text">
        <span className="progress-ring-value">{Math.min(100, Math.round(progress))}%</span>
      </div>
    </div>
  );
}

// Training Module Card Component
interface TrainingCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
  color: string;
  gradient: string;
}

function TrainingCard({ icon, title, description, to, color, gradient }: TrainingCardProps) {
  return (
    <Link className="training-card" to={to} style={{ "--card-color": color, "--card-gradient": gradient } as React.CSSProperties}>
      <div className="training-card-icon">{icon}</div>
      <div className="training-card-content">
        <h3 className="training-card-title">{title}</h3>
        <p className="training-card-desc">{description}</p>
        <span className="training-card-cta">
          <PlayIcon /> Начать
        </span>
      </div>
    </Link>
  );
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
    <section className="panel home-panel" data-testid="home-page">
      {/* Hero Section */}
      <header className="home-hero">
        <div className="home-hero-content">
          <h1 className="home-hero-title">
            <span className="hero-icon"><BrainIcon /></span>
            NeuroSprint
          </h1>
          <p className="home-hero-subtitle">Тренажёр скорости мышления</p>
          {activeUserName && (
            <div className="home-hero-user">
              <span className="user-greeting">Привет,</span>
              <span className="user-name">{activeUserName}</span>
              <span className="user-action">👋</span>
            </div>
          )}
        </div>
        <div className="home-hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-icon"><LightningIcon /></span>
            <div className="hero-stat-content">
              <span className="hero-stat-value">{streakDays}</span>
              <span className="hero-stat-label">дней подряд</span>
            </div>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-icon"><TargetIcon /></span>
            <div className="hero-stat-content">
              <span className="hero-stat-value">{progressValue}/{dailyGoalSessions}</span>
              <span className="hero-stat-label">сессий сегодня</span>
            </div>
          </div>
        </div>
      </header>

      {/* Daily Challenge - Highlight Card */}
      {dailyChallenge && (
        <section className="challenge-highlight" data-testid="home-daily-challenge">
          <div className="challenge-highlight-header">
            <div className="challenge-highlight-icon">
              <TrophyIcon />
            </div>
            <div className="challenge-highlight-info">
              <h2 className="challenge-highlight-title">Challenge дня</h2>
              <p className="challenge-highlight-subtitle">{dailyChallenge.challenge.title}</p>
            </div>
            <span
              className={
                dailyChallenge.completed
                  ? "challenge-badge-complete"
                  : "challenge-badge"
              }
            >
              {dailyChallenge.completed ? "✓ Выполнено" : "В процессе"}
            </span>
          </div>
          <p className="challenge-highlight-desc">{dailyChallenge.challenge.description}</p>
          <div className="challenge-highlight-progress">
            <div className="challenge-progress-bar">
              <div
                className="challenge-progress-fill"
                style={{ width: dailyChallenge.completed ? "100%" : "40%" }}
              />
            </div>
            <span className="challenge-progress-text">{dailyChallenge.progressLabel}</span>
          </div>
          <div className="challenge-highlight-actions">
            <Link
              className={dailyChallenge.completed ? "btn-challenge-secondary" : "btn-challenge-primary"}
              to={dailyChallenge.launchPath}
              data-testid="home-daily-challenge-start"
            >
              <PlayIcon /> {dailyChallenge.completed ? "Повторить" : "Начать"}
            </Link>
          </div>
        </section>
      )}

      {/* Quick Start Training Cards */}
      <section className="quick-start-section" data-testid="home-quick-start">
        <h2 className="section-title">
          <span className="section-title-icon"><LightningIcon /></span>
          Быстрый старт
        </h2>
        <div className="training-cards-grid">
          <TrainingCard
            icon={<GridIcon />}
            title="Таблица Шульте"
            description="Скорость поиска и внимания"
            to="/training/schulte?mode=classic_plus"
            color="#1e7f71"
            gradient="linear-gradient(135deg, #1e7f71 0%, #2d9d8a 100%)"
          />
          <TrainingCard
            icon={<MathIcon />}
            title="Sprint Math"
            description="Скорость вычислений"
            to="/training/sprint-math?mode=sprint_add_sub"
            color="#7c3aed"
            gradient="linear-gradient(135deg, #7c3aed 0%, #9f67ff 100%)"
          />
          <TrainingCard
            icon={<SpeedIcon />}
            title="Reaction"
            description="Скорость реакции"
            to="/training/reaction?mode=reaction_signal"
            color="#f59e0b"
            gradient="linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
          />
        </div>
      </section>

      {/* Today Progress & Stats */}
      <section className="today-progress-modern" data-testid="home-today-progress">
        <h2 className="section-title">
          <span className="section-title-icon"><ChartIcon /></span>
          Прогресс за сегодня
        </h2>
        <div className="progress-content">
          <div className="progress-ring-section">
            <ProgressRing progress={progressPercent} />
            <p className="progress-ring-caption">
              {summaryLoading ? "Загрузка..." : `${progressValue} из ${dailyGoalSessions} сессий`}
            </p>
          </div>
          <div className="stats-grid-modern">
            <div className="stat-card-modern">
              <span className="stat-card-icon">⏱️</span>
              <div className="stat-card-body">
                <span className="stat-card-label">Лучший Classic</span>
                <span className="stat-card-value">
                  {dailySummary?.bestClassicDurationMs != null
                    ? formatSecondsFromMs(dailySummary.bestClassicDurationMs)
                    : "—"}
                </span>
              </div>
            </div>
            <div className="stat-card-modern">
              <span className="stat-card-icon">🎯</span>
              <div className="stat-card-body">
                <span className="stat-card-label">Лучший Timed</span>
                <span className="stat-card-value">
                  {dailySummary?.bestTimedScore != null
                    ? dailySummary.bestTimedScore.toFixed(1)
                    : "—"}
                </span>
              </div>
            </div>
            <div className="stat-card-modern">
              <span className="stat-card-icon">✓</span>
              <div className="stat-card-body">
                <span className="stat-card-label">Точность</span>
                <span className="stat-card-value">
                  {dailySummary?.avgAccuracy != null
                    ? `${(dailySummary.avgAccuracy * 100).toFixed(1)}%`
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Streak & Motivation */}
      <section className="motivation-modern" data-testid="home-motivation">
        <h2 className="section-title">
          <span className="section-title-icon"><FireIcon /></span>
          Твоя серия
        </h2>
        <div className="streak-showcase">
          <div className="streak-main">
            <div className="streak-badge-large">{streakBadge.icon}</div>
            <div className="streak-info">
              <span className="streak-title">{streakBadge.title}</span>
              <span className="streak-count">{streakDays} дней</span>
            </div>
          </div>
          {nextBadge ? (
            <div className="streak-next">
              <span className="streak-next-label">До следующего бейджа:</span>
              <span className="streak-next-value">{Math.max(0, nextBadge.minDays - streakDays)} дн.</span>
              <span className="streak-next-badge">{nextBadge.icon}</span>
            </div>
          ) : (
            <div className="streak-max">
              <span>🏆</span> Максимальный уровень!
            </div>
          )}
        </div>
        <div className="mini-goals-modern">
          {miniGoals.map((goal) => (
            <div
              key={goal.id}
              className={goal.completed ? "mini-goal-modern is-complete" : "mini-goal-modern"}
            >
              <div className="mini-goal-check">
                {goal.completed ? "✓" : "○"}
              </div>
              <div className="mini-goal-content">
                <span className="mini-goal-title">{goal.title}</span>
                <span className="mini-goal-desc">{goal.description}</span>
                <span className="mini-goal-progress">{goal.progressLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Alternative Start Options */}
      <section className="more-options" data-testid="home-planned-start">
        <h2 className="section-title">Другие варианты</h2>
        <div className="options-grid">
          <Link className="option-card" to="/training/pre-session" data-testid="home-open-pre-session">
            <span className="option-card-icon">📋</span>
            <div className="option-card-content">
              <span className="option-card-title">План дня</span>
              <span className="option-card-desc">Рекомендация и цель на сегодня</span>
            </div>
          </Link>
          <Link className="option-card" to="/training" data-testid="home-open-training-hub">
            <span className="option-card-icon">🎮</span>
            <div className="option-card-content">
              <span className="option-card-title">Все тренировки</span>
              <span className="option-card-desc">Выбрать модуль вручную</span>
            </div>
          </Link>
          <Link className="option-card" to="/stats">
            <span className="option-card-icon">📊</span>
            <div className="option-card-content">
              <span className="option-card-title">Статистика</span>
              <span className="option-card-desc">Графики и прогресс</span>
            </div>
          </Link>
        </div>
      </section>
    </section>
  );
}
