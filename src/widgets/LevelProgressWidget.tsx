import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import { achievementRepository } from "../entities/achievement/achievementRepository";
import { levelRepository } from "../entities/level/levelRepository";
import { getAchievementById, getVisibleAchievements } from "../shared/lib/progress/achievementList";
import { buildProgressGoalSummary, describeProgressGoal } from "../shared/lib/progress/nextGoal";
import { getLevelProgress, getXPSourceDescription } from "../shared/lib/progress/xpCalculator";
import type { Session, UserAchievement, UserLevel, XPLog } from "../shared/types/domain";

const StarIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const TrophyIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M18 5v1h-2V4.5c0-.83-.67-1.5-1.5-1.5S13 3.67 13 4.5V6H6C4.89 6 4 6.89 4 8v4c0 1.1.9 2 2 2h1v7c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-7h1c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-7zm-2 12h-8v-8h8v8zm-2-9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
  </svg>
);

const LightningIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

interface LevelProgressWidgetProps {
  compact?: boolean;
  variant?: "default" | "home";
  sessions?: Session[];
  streakDays?: number;
  sessionsToday?: number;
}

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) {
    return "";
  }

  const date = new Date(isoString);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function LevelProgressWidget({
  compact = false,
  variant = "default",
  sessions,
  streakDays,
  sessionsToday
}: LevelProgressWidgetProps) {
  const { activeUserId } = useActiveUserDisplayName();
  const [level, setLevel] = useState<UserLevel | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [recentXPLogs, setRecentXPLogs] = useState<XPLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeUserId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      levelRepository.getOrCreateUserLevel(activeUserId),
      achievementRepository.getUserAchievements(activeUserId),
      levelRepository.getRecentXPLogs(activeUserId, 4)
    ])
      .then(([levelData, achievementsData, recentXPLogsData]) => {
        if (cancelled) {
          return;
        }

        setLevel(levelData);
        setAchievements(achievementsData);
        setRecentXPLogs(recentXPLogsData);
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
      <div className="level-progress-widget level-progress-widget-loading">
        <p>Загрузка прогресса...</p>
      </div>
    );
  }

  if (!level) {
    return null;
  }

  const progressPct = getLevelProgress(level);
  const visibleAchievements = getVisibleAchievements();
  const completedAchievements = achievements.filter((achievement) => achievement.completed);
  const recentAchievements = [...completedAchievements]
    .sort((left, right) => (right.completedAt ?? "").localeCompare(left.completedAt ?? ""))
    .slice(0, 3);
  const latestAchievement = recentAchievements[0]
    ? getAchievementById(recentAchievements[0].achievementId)
    : null;
  const xpToLevelUp = Math.max(0, level.xpToNextLevel - level.currentXP);
  const goals = buildProgressGoalSummary({
    level,
    achievements,
    sessions,
    streakDays,
    sessionsToday
  });

  if (compact) {
    return (
      <div className="level-progress-widget level-progress-widget-compact">
        <div className="level-badge-compact">
          <span className="level-badge-icon">★</span>
          <span className="level-badge-value">{level.level}</span>
        </div>
        <div className="level-progress-bar-compact">
          <div className="level-progress-fill-compact" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    );
  }

  if (variant === "home") {
    return (
      <section
        className="level-progress-widget level-progress-widget-home"
        data-testid="level-progress-widget"
      >
        <div className="level-home-main">
          <div className="level-header">
            <div className="level-badge">
              <span className="level-badge-icon">
                <StarIcon />
              </span>
              <div className="level-badge-content">
                <span className="level-badge-label">Уровень</span>
                <span className="level-badge-value">{level.level}</span>
              </div>
            </div>
            <div className="level-xp-info">
              <span className="level-xp-value">
                {level.currentXP} / {level.xpToNextLevel} XP
              </span>
              <span className="level-xp-total">Всего: {level.totalXP} XP</span>
            </div>
          </div>

          <div className="level-progress-container">
            <div className="level-progress-bar" aria-hidden="true">
              <div className="level-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="level-progress-labels">
              <span className="level-progress-current">{progressPct}% до апа</span>
              <span className="level-progress-next">До уровня {level.level + 1}: {xpToLevelUp} XP</span>
            </div>
          </div>

          <div className="level-home-stats">
            <div className="level-home-stat">
              <span className="level-home-stat-icon">
                <TrophyIcon />
              </span>
              <div>
                <strong>{completedAchievements.length}</strong>
                <span>достижений закрыто</span>
              </div>
            </div>
            <div className="level-home-stat">
              <span className="level-home-stat-icon">
                <LightningIcon />
              </span>
              <div>
                <strong>{level.totalXP}</strong>
                <span>накоплено XP</span>
              </div>
            </div>
            <div className="level-home-stat">
              <span className="level-home-stat-icon">
                <StarIcon size={18} />
              </span>
              <div>
                <strong>{goals.primaryGoal.progressLabel}</strong>
                <span>ближайший рубеж</span>
              </div>
            </div>
          </div>
        </div>

        <div className="level-home-side">
          <div className="level-next-reward level-next-reward-home">
            <div className="level-next-reward-head">
              <div>
                <span className="level-next-reward-label">Ближайшая цель</span>
                <strong>{describeProgressGoal(goals.primaryGoal)}</strong>
              </div>
              <span className="level-next-reward-progress">{goals.primaryGoal.progressPct}%</span>
            </div>
            <p>{goals.primaryGoal.summary}</p>
            <div className="level-next-reward-track" aria-hidden="true">
              <span
                className="level-next-reward-fill"
                style={{ width: `${goals.primaryGoal.progressPct}%` }}
              />
            </div>
            <div className="level-next-reward-meta">
              <span>{goals.primaryGoal.progressLabel}</span>
              {goals.secondaryGoal ? (
                <span>Параллельно: {goals.secondaryGoal.summary}</span>
              ) : null}
            </div>
          </div>

          {latestAchievement ? (
            <div className="level-home-recent">
              <span className="level-home-recent-label">Последнее достижение</span>
              <strong>
                {latestAchievement.icon} {latestAchievement.title}
              </strong>
              <span>{formatDate(recentAchievements[0]?.completedAt)}</span>
            </div>
          ) : null}

          <div className="level-cta">
            <Link className="level-cta-btn" to="/stats#achievements">
              Открыть достижения и XP →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="level-progress-widget" data-testid="level-progress-widget">
      <div className="level-header">
        <div className="level-badge">
          <span className="level-badge-icon">
            <StarIcon />
          </span>
          <div className="level-badge-content">
            <span className="level-badge-label">Уровень</span>
            <span className="level-badge-value">{level.level}</span>
          </div>
        </div>
        <div className="level-xp-info">
          <span className="level-xp-value">
            {level.currentXP} / {level.xpToNextLevel} XP
          </span>
          <span className="level-xp-total">Всего: {level.totalXP} XP</span>
        </div>
      </div>

      <div className="level-progress-container">
        <div className="level-progress-bar">
          <div className="level-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="level-progress-labels">
          <span className="level-progress-current">{progressPct}% до апа</span>
          <span className="level-progress-next">До {level.level + 1} ур.: {xpToLevelUp} XP</span>
        </div>
      </div>

      <div className="level-quick-stats">
        <div className="quick-stat">
          <span className="quick-stat-icon">
            <TrophyIcon />
          </span>
          <div className="quick-stat-content">
            <span className="quick-stat-value">
              {completedAchievements.length}/{visibleAchievements.length}
            </span>
            <span className="quick-stat-label">Достижений</span>
          </div>
        </div>
        <div className="quick-stat">
          <span className="quick-stat-icon">
            <LightningIcon />
          </span>
          <div className="quick-stat-content">
            <span className="quick-stat-value">{level.totalXP}</span>
            <span className="quick-stat-label">Всего XP</span>
          </div>
        </div>
        <div className="quick-stat">
          <span className="quick-stat-icon">
            <StarIcon size={20} />
          </span>
          <div className="quick-stat-content">
            <span className="quick-stat-value">{xpToLevelUp}</span>
            <span className="quick-stat-label">До уровня {level.level + 1}</span>
          </div>
        </div>
      </div>

      <div className="level-next-reward">
        <div className="level-next-reward-head">
          <div>
            <span className="level-next-reward-label">Ближайшая цель</span>
            <strong>{describeProgressGoal(goals.primaryGoal)}</strong>
          </div>
          <span className="level-next-reward-progress">{goals.primaryGoal.progressPct}%</span>
        </div>
        <p>{goals.primaryGoal.summary}</p>
        <div className="level-next-reward-track" aria-hidden="true">
          <span
            className="level-next-reward-fill"
            style={{ width: `${goals.primaryGoal.progressPct}%` }}
          />
        </div>
        <div className="level-next-reward-meta">
          <span>{goals.primaryGoal.progressLabel}</span>
          {goals.secondaryGoal ? (
            <span>Параллельно: {goals.secondaryGoal.summary}</span>
          ) : null}
        </div>
      </div>

      {recentAchievements.length > 0 ? (
        <div className="recent-achievements">
          <h4 className="recent-achievements-title">Последние достижения</h4>
          <div className="recent-achievements-list">
            {recentAchievements.map((achievement) => {
              const fullAchievement = getAchievementById(achievement.achievementId);
              if (!fullAchievement) {
                return null;
              }

              return (
                <div key={achievement.id} className="recent-achievement-item">
                  <span className="recent-achievement-icon">{fullAchievement.icon}</span>
                  <div className="recent-achievement-content">
                    <span className="recent-achievement-title">{fullAchievement.title}</span>
                    <span className="recent-achievement-date">{formatDate(achievement.completedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {recentXPLogs.length > 0 ? (
        <div className="level-recent-xp">
          <h4 className="recent-achievements-title">Последние XP</h4>
          <div className="level-recent-xp-list">
            {recentXPLogs.map((xpLog) => (
              <div key={xpLog.id} className="level-recent-xp-item">
                <div>
                  <strong>{getXPSourceDescription(xpLog.source, xpLog.amount)}</strong>
                  <span>{formatDate(xpLog.createdAt)}</span>
                </div>
                <span className="level-recent-xp-value">+{xpLog.amount}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="level-cta">
        <Link className="level-cta-btn" to="/stats#achievements">
          Открыть достижения и XP →
        </Link>
      </div>
    </section>
  );
}
