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

// SVG Icons - современный дизайн в едином стиле
const FireIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M12 2c0 0-7 4.5-7 11a7 7 0 0014 0c0-6.5-7-11-7-11zm0 19a5 5 0 01-5-5c0-2.5 2.5-5.5 5-8 2.5 2.5 5 5.5 5 8a5 5 0 01-5 5z"/>
    <path d="M12 6c-1.5 1.5-2.5 3-2.5 4.5a2.5 2.5 0 005 0c0-1.5-1-3-2.5-4.5z" opacity="0.6"/>
  </svg>
);

const LightningIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);

const TargetIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={size} height={size}>
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

const TrophyIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M12 2l-1 3H6a2 2 0 00-2 2v2c0 2.5 1.5 4.5 3.5 5.5A5 5 0 0011 18v2H8v2h8v-2h-3v-2a5 5 0 003.5-3.5c2-1 3.5-3 3.5-5.5V7a2 2 0 00-2-2h-5L12 2z"/>
    <path d="M4 7H2v2a4 4 0 004 4V7z"/>
    <path d="M20 7h2v2a4 4 0 01-4 4V7z"/>
  </svg>
);

const PlayIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M8 5v14l11-7L8 5z"/>
  </svg>
);

const ChartIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M3 3v18h18"/>
    <path d="M7 16l4-4 4 4 5-6"/>
  </svg>
);

const BrainIcon = ({ size = 40 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
    {/* Outer brain shape */}
    <path
      d="M12 2C9 2 7 4 7 6c0 1 .3 2 .8 2.8C6.2 9.5 5 11.5 5 14c0 3 2.2 5.5 5 6v2a2 2 0 004 0v-2c2.8-.5 5-3 5-6 0-2.5-1.2-4.5-2.8-5.2.5-.8.8-1.8.8-2.8 0-2-2-4-5-4z"
      fill="currentColor"
      opacity="0.9"
    />
    {/* Left hemisphere detail */}
    <path
      d="M9 8c-1 1-1.5 2-1.5 3s.7 2 1.5 2"
      stroke="rgba(255,255,255,0.6)"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    {/* Right hemisphere detail */}
    <path
      d="M15 8c1 1 1.5 2 1.5 3s-.7 2-1.5 2"
      stroke="rgba(255,255,255,0.6)"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    {/* Neural connections */}
    <circle cx="9" cy="13" r="1" fill="rgba(255,255,255,0.8)"/>
    <circle cx="15" cy="13" r="1" fill="rgba(255,255,255,0.8)"/>
    <circle cx="12" cy="15" r="0.8" fill="rgba(255,255,255,0.6)"/>
    {/* Synapse lines */}
    <path d="M10 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
  </svg>
);

const GridIcon = ({ size = 28 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

const MathIcon = ({ size = 28 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width={size} height={size}>
    <path d="M4 8l4 4-4 4"/>
    <path d="M12 6v12"/>
    <path d="M8 12h8"/>
    <path d="M16 8l4 4-4 4"/>
  </svg>
);

const SpeedIcon = ({ size = 28 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M22 12A10 10 0 0012 2v10l8 8"/>
    <path d="M12 2a10 10 0 0110 10"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>
);

const StarIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M12 2l3.5 7.5L23 11l-6 5.5L18.5 25 12 20.5 5.5 25 7 16.5 1 11l7.5-1.5L12 2z"/>
  </svg>
);

const CalendarIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <path d="M16 2v4M8 2v4M3 10h18"/>
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
