import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import {
  dailyChallengeRepository,
  resolveAdaptiveDailyChallengeModeId
} from "../entities/challenge/dailyChallengeRepository";
import { dailyTrainingRepository } from "../entities/training/dailyTrainingRepository";
import { sessionRepository } from "../entities/session/sessionRepository";
import { levelRepository } from "../entities/level/levelRepository";
import { toLocalDateKey } from "../shared/lib/date/date";
import { hasLevelUpCelebrated, markLevelUpCelebrated } from "../shared/lib/progress/levelCelebration";
import { getSettings } from "../shared/lib/settings/settings";
import { buildSkillGuidance } from "../shared/lib/training/skillGuidance";
import { buildSkillRoadmap } from "../shared/lib/training/skillRoadmap";
import { CelebrationModal } from "../shared/ui/ConfettiCelebration";
import { DailyTrainingWidget } from "../widgets/DailyTrainingWidget";
import { LevelProgressWidget } from "../widgets/LevelProgressWidget";
import { LevelUpModal } from "../widgets/LevelUpModal";
import type {
  DailyChallengeProgress,
  DailyProgressSummary,
  DailyTrainingProgress,
  Session,
  TrainingModuleId,
  TrainingModeId
} from "../shared/types/domain";

function getChallengeModeTitle(title: string): string {
  return title.replace(/^Challenge дня:\s*/i, "").trim();
}

function getModeLabel(modeId: TrainingModeId | string): string {
  const dictionary: Partial<Record<TrainingModeId | string, string>> = {
    classic_plus: "Таблица Шульте",
    sprint_add_sub: "Sprint Math",
    reaction_signal: "Reaction",
    reaction_pair: "Reaction",
    reaction_number: "Reaction",
    reaction_stroop: "Reaction",
    memory_match_classic: "Memory Match",
    memory_grid: "Memory Grid",
    n_back: "N-Back",
    decision_rush_classic: "Decision Rush",
    spatial_memory_classic: "Spatial Memory",
    pattern_classic: "Pattern Recognition"
  };

  return dictionary[modeId] ?? modeId;
}

// SVG Icons - современный дизайн в едином стиле
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
    <path d="M18 5v1h-2V4.5c0-.83-.67-1.5-1.5-1.5S13 3.67 13 4.5V6H6C4.89 6 4 6.89 4 8v4c0 1.1.9 2 2 2h1v7c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-7h1c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-7zm-2 12h-8v-8h8v8zm-2-9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
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

const modulePrimaryRouteById: Record<TrainingModuleId, string> = {
  schulte: "/training/schulte?mode=classic_plus",
  sprint_math: "/training/sprint-math?mode=sprint_add_sub",
  reaction: "/training/reaction?mode=reaction_signal",
  n_back: "/training/nback",
  memory_grid: "/training/memory-grid",
  spatial_memory: "/training/spatial-memory",
  memory_match: "/training/memory-match",
  decision_rush: "/training/decision-rush",
  pattern_recognition: "/training/pattern-recognition"
};

function getSkillTrendLabel(trend: "up" | "down" | "steady", hasData: boolean): string {
  if (!hasData) {
    return "\u0421\u0442\u0430\u0440\u0442";
  }

  if (trend === "up") {
    return "\u0420\u043e\u0441\u0442";
  }

  if (trend === "down") {
    return "\u0421\u043f\u0430\u0434";
  }

  return "\u0420\u043e\u0432\u043d\u043e";
}

export function HomePage() {
  const { activeUserId } = useActiveUserDisplayName();
  const settings = getSettings();
  const dailyGoalSessions = settings.dailyGoalSessions;
  const [dailySummary, setDailySummary] = useState<DailyProgressSummary | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallengeProgress | null>(null);
  const [dailyTraining, setDailyTraining] = useState<DailyTrainingProgress | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [challengeIconMissing, setChallengeIconMissing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Проверяем, показывали ли уже celebration сегодня
  const today = toLocalDateKey(new Date());
  const celebratedToday = localStorage.getItem(`daily-training-celebrated:${activeUserId || 'unknown'}:${today}`) === 'true';
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [levelUpInfo, setLevelUpInfo] = useState<{ fromLevel: number; toLevel: number } | null>(null);
  const levelUpCelebratedToday = activeUserId ? hasLevelUpCelebrated(activeUserId, today) : false;

  useEffect(() => {
    if (!activeUserId) {
      setDailySummary(null);
      setDailyChallenge(null);
      setDailyTraining(null);
      setAllSessions([]);
      setStreakDays(0);
      return;
    }

    let cancelled = false;

    void Promise.allSettled([
      sessionRepository.getDailyProgressSummary(activeUserId),
      sessionRepository.getIndividualInsights(activeUserId),
      dailyChallengeRepository.getOrCreateForToday(activeUserId),
      dailyTrainingRepository.getOrCreateForToday(activeUserId),
      sessionRepository.listByUser(activeUserId),
      levelRepository.getOrCreateUserLevel(activeUserId)
    ])
      .then(([summaryResult, insightsResult, challengeResult, trainingResult, sessionsResult, levelResult]) => {
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

        if (trainingResult.status === "fulfilled") {
          setDailyTraining(trainingResult.value);

          // Показываем celebration только если:
          // 1. Цель достигнута
          // 2. Ещё не показывали сегодня
          if (trainingResult.value.completed && !celebratedToday) {
            setShowCelebration(true);
            // Сохраняем что показали celebration
            localStorage.setItem(`daily-training-celebrated:${activeUserId}:${today}`, 'true');
          }
        } else {
          setDailyTraining(null);
        }

        if (sessionsResult.status === "fulfilled") {
          setAllSessions(sessionsResult.value);
        } else {
          setAllSessions([]);
        }

        // Проверяем Level Up
        if (levelResult.status === "fulfilled" && levelResult.value) {
          const level = levelResult.value;
          const levelUpToday = level.lastLevelUpAt && toLocalDateKey(new Date(level.lastLevelUpAt)) === today;
          // Показываем Level Up modal если уровень повысился сегодня и ещё не показывали
          if (levelUpToday && activeUserId && !levelUpCelebratedToday) {
            setLevelUpInfo({
              fromLevel: level.level - 1,
              toLevel: level.level
            });
            markLevelUpCelebrated(activeUserId, today);
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserId, celebratedToday, levelUpCelebratedToday, today]);

  const progressValue = dailySummary?.sessionsTotal ?? 0;
  const progressPercent = Math.min(100, Math.round((progressValue / dailyGoalSessions) * 100));
  const skillGuidance = useMemo(() => buildSkillGuidance(allSessions), [allSessions]);
  const skillRoadmap = useMemo(() => buildSkillRoadmap(allSessions), [allSessions]);
  const adaptiveChallengeModeId = useMemo(
    () =>
      dailyChallenge
        ? resolveAdaptiveDailyChallengeModeId(dailyChallenge.challenge.localDate, allSessions)
        : null,
    [allSessions, dailyChallenge]
  );
  const challengeMatchesGrowth = Boolean(
    dailyChallenge &&
    skillGuidance.hasData &&
    adaptiveChallengeModeId &&
    dailyChallenge.challenge.modeId === adaptiveChallengeModeId
  );
  const skillGrowthLaunchPath = modulePrimaryRouteById[skillGuidance.primaryModuleId] ?? "/training";
  const preSessionPath = skillGuidance.hasData
    ? `/training/pre-session?module=${skillGuidance.primaryModuleId}`
    : "/training/pre-session";
  const weeklyFocusHeadline = skillRoadmap.hasData
    ? `На этой неделе — ${skillRoadmap.guidance.focusLabel.toLowerCase()}`
    : "Соберите стартовый профиль";
  const weeklyFocusTitle = skillRoadmap.hasData
    ? skillRoadmap.guidance.focusLabel
    : "Стартовый профиль";
  const weeklyFocusLead = skillRoadmap.hasData
    ? skillRoadmap.weekGoal
    : skillRoadmap.summary;
  const weeklyFocusStartLabel = skillRoadmap.hasData ? "Лучший старт сегодня" : "Лучший старт сейчас";
  const weeklyFocusMeta = skillRoadmap.hasData
    ? skillRoadmap.cadence
    : "3-5 коротких сессий уже дадут системе рабочую карту навыков.";
  const weeklyFocusDay = skillRoadmap.days[0];
  const skillSystemTitle = skillGuidance.hasData
    ? "Система навыков уже работает"
    : "Система навыков собирает стартовый профиль";
  const skillSystemLead = skillGuidance.hasData
    ? `Сейчас сильнее всего у вас ${skillGuidance.strongestLabel.toLowerCase()}, а следующим лучшим шагом выглядит ${skillGuidance.focusLabel.toLowerCase()}.`
    : "После нескольких завершённых сессий система покажет сильные стороны, зону роста и следующий полезный фокус.";
  const skillSystemStatus = skillGuidance.hasData
    ? `Профиль собран на основе ${skillGuidance.profile.totalSessions} сессий`
    : "Нужно 3-5 коротких сессий в основных тренажёрах";
  const challengeProgressPercent = dailyChallenge
    ? Math.min(
        100,
        Math.round(
          (Math.min(dailyChallenge.attemptsCount, dailyChallenge.challenge.requiredAttempts) /
            Math.max(1, dailyChallenge.challenge.requiredAttempts)) *
            100
        )
      )
    : 0;
  const challengeModeTitle = dailyChallenge
    ? getChallengeModeTitle(dailyChallenge.challenge.title)
    : "";
  const challengeSupportLabel = challengeMatchesGrowth
    ? `Сегодня особенно полезен для ${skillGuidance.focusLabel.toLowerCase()}.`
    : dailyChallenge?.completed
      ? "Дневной ориентир уже закрыт."
      : "Короткий ориентир на день без лишней нагрузки.";
  const challengeValueText = dailyChallenge
    ? dailyChallenge.completed
      ? "Можно повторить спокойно, если хотите закрепить результат."
      : challengeMatchesGrowth
        ? `Совпадает с текущей зоной роста и помогает двигать профиль навыков точнее.`
        : "Одна точная сессия помогает не терять ритм и быстрее войти в тренировку."
    : "";
  const challengeMeta = dailyChallenge
    ? [
        `${dailyChallenge.challenge.requiredAttempts} сессия`,
        dailyChallenge.completed
          ? "Закрыт на сегодня"
          : `Осталось ${dailyChallenge.remainingAttempts}`,
        challengeMatchesGrowth ? `Фокус: ${skillGuidance.focusLabel}` : `Модуль: ${getModeLabel(dailyChallenge.challenge.modeId)}`
      ]
    : [];
  const remainingDailySessions = Math.max(0, dailyGoalSessions - progressValue);
  const extraSessions = Math.max(0, progressValue - dailyGoalSessions);
  const heroStatusLabel = progressValue >= dailyGoalSessions
    ? extraSessions > 0
      ? `Сверх цели +${extraSessions}`
      : "Цель дня закрыта"
    : `Осталось ${remainingDailySessions}`;
  const heroNextStep = dailyChallenge && !dailyChallenge.completed
    ? `Лучший следующий шаг: ${challengeModeTitle}.`
    : skillGuidance.hasData
      ? `Лучший следующий шаг: ${skillGuidance.primaryModuleTitle}.`
      : "Сделайте 3-5 коротких сессий, чтобы собрать стартовый профиль.";
  const heroProgressSummary = progressValue >= dailyGoalSessions
    ? extraSessions > 0
      ? `${progressValue} сессий сегодня, это на ${extraSessions} больше дневной цели`
      : `${progressValue} из ${dailyGoalSessions} сессий выполнено`
    : `${progressValue} из ${dailyGoalSessions} сессий выполнено`;

  return (
    <section className="panel home-panel" data-testid="home-page">
      {/* Hero Section */}
      <header className="home-hero">
        <div className="home-hero-content">
          <div className="home-hero-heading">
            <div>
              <p className="home-hero-kicker">Сегодня</p>
              <h1 className="home-hero-title">План на день</h1>
            </div>
          </div>
          <p className="home-hero-subtitle">
            Короткая цель на сегодня: сделайте {dailyGoalSessions} сессии в удобном темпе.
          </p>
          <p className="home-hero-note">{heroNextStep}</p>
        </div>
        <div className="home-hero-summary">
          <div className="home-hero-summary-head">
            <span className="home-hero-summary-label">Статус дня</span>
            <div className="home-hero-status-row">
              <span className="home-hero-chip">{heroStatusLabel}</span>
            </div>
          </div>
          <div className="home-hero-progress">
            <div className="home-hero-progress-bar" aria-hidden="true">
              <span className="home-hero-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="home-hero-progress-meta">
              <span>{heroProgressSummary}</span>
              <strong>{progressPercent}%</strong>
            </div>
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
        </div>
      </header>

      <div className="home-priority-grid">
        {dailyChallenge && (
          <section className="challenge-highlight" data-testid="home-daily-challenge">
            <div className="challenge-highlight-header">
              <div className="challenge-highlight-icon">
                {!challengeIconMissing ? (
                  <img
                    className="challenge-highlight-image"
                    src="/challenge-day-icon.svg"
                    alt=""
                    onError={() => setChallengeIconMissing(true)}
                  />
                ) : (
                  <TrophyIcon />
                )}
              </div>
              <div className="challenge-highlight-info">
                <h2 className="challenge-highlight-title">Челлендж дня</h2>
                <p className="challenge-highlight-subtitle">{challengeModeTitle}</p>
              </div>
              <span
                className={
                  dailyChallenge.completed ? "challenge-badge-complete" : "challenge-badge"
                }
              >
                {dailyChallenge.completed ? "Закрыт" : "В фокусе"}
              </span>
            </div>

            <div className="challenge-highlight-body">
              <p className="challenge-highlight-desc">{challengeSupportLabel}</p>

              <div className="challenge-highlight-value">
                <span className="challenge-highlight-value-label">Почему это полезно</span>
                <p>{challengeValueText}</p>
              </div>

              <div className="challenge-highlight-meta">
                {challengeMeta.map((item) => (
                  <span
                    key={item}
                    className={
                      item.startsWith("Фокус:")
                        ? "challenge-highlight-chip is-growth"
                        : "challenge-highlight-chip"
                    }
                  >
                    {item}
                  </span>
                ))}
              </div>

              {challengeMatchesGrowth ? (
                <p className="challenge-highlight-growth" data-testid="home-daily-challenge-growth">
                  Совпадает с системой роста: сегодня лучший вклад даст {skillGuidance.primaryModuleTitle}.
                </p>
              ) : null}
            </div>

            <div className="challenge-highlight-footer">
              <div className="challenge-highlight-progress">
                <div className="challenge-progress-bar" aria-hidden="true">
                  <div
                    className="challenge-progress-fill"
                    style={{ width: `${challengeProgressPercent}%` }}
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
                  <PlayIcon /> {dailyChallenge.completed ? "Повторить спокойно" : "Запустить челлендж"}
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="home-skill-growth" data-testid="home-skill-growth">
          <div className="home-skill-growth-head">
            <div className="home-skill-growth-heading">
              <p className="stats-section-kicker">Система навыков</p>
              <h2>{skillSystemTitle}</h2>
              <p className="home-skill-growth-lead">{skillSystemLead}</p>
            </div>
          </div>

          <div className="home-skill-growth-pills" aria-hidden="true">
            {skillGuidance.hasData ? (
              <>
                <span className="home-skill-growth-pill">Фокус: {skillGuidance.focusLabel}</span>
                <span className="home-skill-growth-pill">Опора: {skillGuidance.strongestLabel}</span>
                <span className="home-skill-growth-pill">Ритм: неделя</span>
              </>
            ) : (
              <>
                <span className="home-skill-growth-pill">Статус: стартовый профиль</span>
                <span className="home-skill-growth-pill">Нужно 3-5 сессий</span>
                <span className="home-skill-growth-pill">
                  Старт: {skillGuidance.primaryModuleTitle}
                </span>
              </>
            )}
          </div>

          <div className="home-skill-growth-status" data-testid="home-skill-growth-status">
            <article className="home-skill-growth-status-card">
              <span className="home-skill-growth-status-label">{"\u0421\u0442\u0430\u0442\u0443\u0441"}</span>
              <strong>{skillSystemStatus}</strong>
            </article>
            <article className="home-skill-growth-status-card">
              <span className="home-skill-growth-status-label">{"\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u0444\u043e\u043a\u0443\u0441"}</span>
              <strong>{skillGuidance.focusLabel}</strong>
            </article>
            <article className="home-skill-growth-status-card">
              <span className="home-skill-growth-status-label">{"\u041b\u0443\u0447\u0448\u0430\u044f \u043e\u043f\u043e\u0440\u0430"}</span>
              <strong>{skillGuidance.strongestLabel}</strong>
            </article>
          </div>

          <div className="home-skill-growth-mini-grid" data-testid="home-skill-growth-mini-grid">
            {skillGuidance.profile.axes.map((axis) => {
              const isFocus = axis.id === skillGuidance.focusSkillId;
              const isStrongest = axis.id === skillGuidance.strongestSkillId;

              return (
                <article
                  key={axis.id}
                  className={[
                    "home-skill-mini-card",
                    isFocus ? "is-focus" : "",
                    isStrongest ? "is-strongest" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-testid={`home-skill-axis-${axis.id}`}
                >
                  <div className="home-skill-mini-top">
                    <span className="home-skill-mini-name">{axis.shortLabel}</span>
                    <span className={`home-skill-mini-trend is-${axis.trend}`}>
                      {getSkillTrendLabel(axis.trend, skillGuidance.hasData)}
                    </span>
                  </div>

                  <div className="home-skill-mini-score-row">
                    <strong>{axis.score}</strong>
                    <span>{"\u0443\u0440."} {axis.level}</span>
                  </div>

                  <div className="home-skill-mini-track" aria-hidden="true">
                    <span
                      className="home-skill-mini-fill"
                      style={{ width: `${axis.progressPct}%` }}
                    />
                  </div>

                  <div className="home-skill-mini-meta">
                    <span>{axis.sessions > 0 ? `${axis.sessions} \u0441\u0435\u0441\u0441\u0438\u0439` : "\u041d\u0443\u0436\u0435\u043d \u0441\u0442\u0430\u0440\u0442"}</span>
                    {isStrongest ? <span className="home-skill-mini-tag">{"\u0421\u0438\u043b\u044c\u043d\u0430\u044f \u0441\u0442\u043e\u0440\u043e\u043d\u0430"}</span> : null}
                    {isFocus ? <span className="home-skill-mini-tag is-focus">{"\u0417\u043e\u043d\u0430 \u0440\u043e\u0441\u0442\u0430"}</span> : null}
                  </div>
                </article>
              );
            })}
          </div>

          <article className="home-skill-growth-card is-focus" data-testid="home-weekly-focus">
            <span className="home-skill-growth-card-label">{"\u0427\u0442\u043e \u0434\u0435\u043b\u0430\u0442\u044c \u0434\u0430\u043b\u044c\u0448\u0435"}</span>
            <strong>{weeklyFocusTitle}</strong>
            <p>{weeklyFocusLead}</p>
            <span className="home-skill-growth-meta">{weeklyFocusMeta}</span>
          </article>

          <article className="home-skill-growth-card" data-testid="home-skill-growth-next">
            <span className="home-skill-growth-card-label">{weeklyFocusStartLabel}</span>
            <strong>{weeklyFocusDay?.moduleTitle ?? skillGuidance.primaryModuleTitle}</strong>
            <p>
              {weeklyFocusDay
                ? `${weeklyFocusDay.title}. ${weeklyFocusDay.note}`
                : skillGuidance.nextStep}
            </p>
            <span className="home-skill-growth-meta">{weeklyFocusMeta}</span>
          </article>

          <div className="home-skill-growth-actions">
            <Link
              className="home-skill-growth-action is-primary"
              to={skillGrowthLaunchPath}
              data-testid="home-skill-growth-start"
            >
              {skillRoadmap.hasData
                ? `Начать с ${skillGuidance.primaryModuleTitle}`
                : skillGuidance.ctaLabel}
            </Link>
            <Link
              className="home-skill-growth-action"
              to="/stats#skills"
              data-testid="home-skill-growth-stats"
            >
              Открыть навыки в статистике
            </Link>
          </div>
        </section>
      </div>

      <div className="home-secondary-flow">
        <DailyTrainingWidget compact={true} showHeatmap={true} showSummary={false} />

        <LevelProgressWidget
          compact={false}
          variant="home"
          sessions={allSessions}
          streakDays={streakDays}
          sessionsToday={dailySummary?.sessionsTotal ?? 0}
        />

        {/* Alternative Start Options */}
        <section className="more-options" data-testid="home-planned-start">
          <div className="more-options-head">
            <div>
              <p className="stats-section-kicker">Навигация</p>
              <h2 className="section-title">Если нужен другой путь</h2>
            </div>
            <p className="more-options-note">
              Основной сценарий уже выше. Здесь только запасные переходы без перегруза.
            </p>
          </div>

          <div className="more-options-grid">
            <Link className="option-card option-card-featured" to={preSessionPath} data-testid="home-open-pre-session">
              <span className="option-card-icon">📋</span>
              <div className="option-card-content">
                <span className="option-card-title">Открыть план дня</span>
                <span className="option-card-desc">Спокойный вход с рекомендацией, целью и подбором режима.</span>
              </div>
              <span className="option-card-arrow">→</span>
            </Link>

            <div className="options-stack">
              <Link className="option-card option-card-quiet" to="/training" data-testid="home-open-training-hub">
                <span className="option-card-icon">🎮</span>
                <div className="option-card-content">
                  <span className="option-card-title">Все тренировки</span>
                  <span className="option-card-desc">Выбрать модуль вручную</span>
                </div>
              </Link>
              <Link className="option-card option-card-quiet" to="/stats">
                <span className="option-card-icon">📊</span>
                <div className="option-card-content">
                  <span className="option-card-title">Статистика</span>
                  <span className="option-card-desc">Прогресс, навыки и достижения</span>
                </div>
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Celebration Modal */}
      {showCelebration && dailyTraining?.completed && (
        <CelebrationModal
          title="Дневная цель достигнута!"
          message="Отличная работа! Вы выполнили все сессии на сегодня. Так держать!"
          onClose={() => setShowCelebration(false)}
          showConfetti={true}
        />
      )}

      {/* Level Up Modal */}
      {levelUpInfo && (
        <LevelUpModal
          fromLevel={levelUpInfo.fromLevel}
          toLevel={levelUpInfo.toLevel}
          onClose={() => setLevelUpInfo(null)}
        />
      )}
    </section>
  );
}

