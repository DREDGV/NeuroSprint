import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import { sessionRepository } from "../entities/session/sessionRepository";
import { dailyTrainingRepository } from "../entities/training/dailyTrainingRepository";
import { HeatmapCalendar } from "../shared/ui/HeatmapCalendar";
import { buildSkillGuidance } from "../shared/lib/training/skillGuidance";
import type {
  DailyTrainingCompletionSummary,
  DailyTrainingHeatmapCell,
  DailyTrainingProgress,
  DailyTrainingStreakSummary,
  Session
} from "../shared/types/domain";

const FireIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M12 2c0 0-7 4.5-7 11a7 7 0 0014 0c0-6.5-7-11-7-11zm0 19a5 5 0 01-5-5c0-2.5 2.5-5.5 5-8 2.5 2.5 5 5.5 5 8a5 5 0 01-5 5z" />
    <path d="M12 6c-1.5 1.5-2.5 3-2.5 4.5a2.5 2.5 0 005 0c0-1.5-1-3-2.5-4.5z" opacity="0.6" />
  </svg>
);

const TargetIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={size} height={size}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const CalendarIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const CheckCircleIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);

const PlayIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M8 5v14l11-7L8 5z" />
  </svg>
);

interface DailyTrainingWidgetProps {
  showHeatmap?: boolean;
  showSummary?: boolean;
  compact?: boolean;
}

export function DailyTrainingWidget({
  showHeatmap = true,
  showSummary = true,
  compact = false
}: DailyTrainingWidgetProps) {
  const { activeUserId } = useActiveUserDisplayName();
  const [progress, setProgress] = useState<DailyTrainingProgress | null>(null);
  const [summary, setSummary] = useState<DailyTrainingCompletionSummary | null>(null);
  const [streak, setStreak] = useState<DailyTrainingStreakSummary | null>(null);
  const [heatmapData, setHeatmapData] = useState<DailyTrainingHeatmapCell[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const skillGuidance = useMemo(() => buildSkillGuidance(allSessions), [allSessions]);
  const showGrowthFocus = Boolean(
    progress &&
      !progress.completed &&
      progress.training.completedSessions === 0 &&
      skillGuidance.hasData
  );
  const primaryLaunchPath = showGrowthFocus
    ? `/training/pre-session?module=${skillGuidance.primaryModuleId}`
    : progress?.launchPath ?? "/training/pre-session";
  const primaryCtaLabel = showGrowthFocus
    ? `Старт: ${skillGuidance.primaryModuleTitle}`
    : "Продолжить";

  useEffect(() => {
    if (!activeUserId) {
      setAllSessions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      dailyTrainingRepository.getOrCreateForToday(activeUserId),
      dailyTrainingRepository.getCompletionSummary(activeUserId, 30),
      dailyTrainingRepository.getStreakSummary(activeUserId, 30),
      dailyTrainingRepository.getHeatmapData(activeUserId, 3),
      sessionRepository.listByUser(activeUserId)
    ])
      .then(([progressData, summaryData, streakData, heatmap, sessions]) => {
        if (cancelled) {
          return;
        }

        setProgress(progressData);
        setSummary(summaryData);
        setStreak(streakData);
        setHeatmapData(heatmap);
        setAllSessions(sessions);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  if (!activeUserId || loading) {
    return (
      <div className="daily-training-widget daily-training-widget-loading">
        <p>Загрузка прогресса...</p>
      </div>
    );
  }

  return (
    <section
      className={compact ? "daily-training-widget is-compact" : "daily-training-widget"}
      data-testid="daily-training-widget"
    >
      {progress ? (
        <div className="daily-training-today">
          <div className="daily-training-today-header">
            <h3 className="daily-training-today-title">
              <TargetIcon /> Сегодня
            </h3>
            {progress.completed ? (
              <span className="daily-training-badge-complete">
                <CheckCircleIcon /> Выполнено
              </span>
            ) : null}
          </div>

          <div className="daily-training-progress-bar" aria-hidden="true">
            <div
              className={`daily-training-progress-fill ${progress.completed ? "complete" : ""}`}
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>

          <div className="daily-training-progress-info">
            <span className="daily-training-progress-text">
              {progress.training.completedSessions} / {progress.training.goalSessions} сессий
            </span>
            <span className="daily-training-progress-percent">{progress.progressPercent}%</span>
          </div>

          {!progress.completed ? (
            <div className="daily-training-cta">
              <p className="daily-training-cta-text">
                Осталось сессий: <strong>{progress.remainingSessions}</strong>
              </p>
              {showGrowthFocus ? (
                <p className="daily-training-growth-note" data-testid="daily-training-growth-focus">
                  Фокус роста: <strong>{skillGuidance.focusLabel}</strong> • опора:{" "}
                  {skillGuidance.strongestLabel}
                </p>
              ) : null}
              <Link
                className="daily-training-cta-btn"
                to={primaryLaunchPath}
                data-testid="daily-training-continue"
              >
                <PlayIcon /> {primaryCtaLabel}
              </Link>
            </div>
          ) : (
            <div className="daily-training-congrats">Дневная цель закрыта. Отличная работа.</div>
          )}
        </div>
      ) : null}

      {streak ? (
        <div className={compact ? "daily-training-streak is-compact" : "daily-training-streak"}>
          <h3 className="daily-training-streak-title">
            <FireIcon /> Серия
          </h3>
          <div className="daily-training-streak-content">
            <div className="daily-training-streak-main">
              <span className="daily-training-streak-value">{streak.currentStreakDays}</span>
              <span className="daily-training-streak-label">дней подряд</span>
            </div>
            {streak.bestStreakDays > streak.currentStreakDays ? (
              <div className="daily-training-streak-best">Лучший ритм: {streak.bestStreakDays} дн.</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showSummary && summary ? (
        <div className="daily-training-summary">
          <h3 className="daily-training-summary-title">
            <CalendarIcon /> За 30 дней
          </h3>
          <div className="daily-training-summary-grid">
            <div className="daily-training-summary-item">
              <span className="daily-training-summary-value">{summary.completedDays}</span>
              <span className="daily-training-summary-label">Закрытых дней</span>
            </div>
            <div className="daily-training-summary-item">
              <span className="daily-training-summary-value">{summary.totalSessions}</span>
              <span className="daily-training-summary-label">Всего сессий</span>
            </div>
            <div className="daily-training-summary-item">
              <span className="daily-training-summary-value">{summary.avgSessionsPerDay.toFixed(1)}</span>
              <span className="daily-training-summary-label">Среднее в день</span>
            </div>
            <div className="daily-training-summary-item">
              <span className="daily-training-summary-value">{summary.completionRatePct.toFixed(0)}%</span>
              <span className="daily-training-summary-label">Выполнение</span>
            </div>
          </div>
        </div>
      ) : null}

      {showHeatmap && heatmapData.length > 0 ? (
        <div
          className={compact ? "daily-training-heatmap is-compact" : "daily-training-heatmap"}
          data-testid="daily-training-heatmap"
        >
          <div className="daily-training-heatmap-head">
            <h3 className="daily-training-heatmap-title">Календарь тренировок</h3>
            <p className="daily-training-heatmap-note">Последние 3 месяца без перегруза деталями.</p>
          </div>
          <div className={compact ? "daily-training-heatmap-layout" : undefined}>
            <HeatmapCalendar cells={heatmapData} />
            {compact && (summary || streak) ? (
              <aside className="daily-training-heatmap-aside" aria-label="Ритм в цифрах">
                <span className="daily-training-heatmap-aside-label">Ритм в цифрах</span>
                {streak ? (
                  <div className="daily-training-heatmap-stat">
                    <strong>{streak.currentStreakDays}</strong>
                    <span>дней подряд</span>
                  </div>
                ) : null}
                {summary ? (
                  <div className="daily-training-heatmap-stat">
                    <strong>{summary.completedDays}</strong>
                    <span>закрыто дней за 30 дней</span>
                  </div>
                ) : null}
                {summary ? (
                  <div className="daily-training-heatmap-stat">
                    <strong>{summary.avgSessionsPerDay.toFixed(1)}</strong>
                    <span>сессии в день</span>
                  </div>
                ) : null}
              </aside>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
