import { Link } from "react-router-dom";

interface SessionResultMetric {
  label: string;
  value: string;
  testId?: string;
}

interface SessionSaveState {
  text: string;
  testId: string;
}

interface SessionResultSummaryProps {
  testId: string;
  title: string;
  metrics: SessionResultMetric[];
  previousSummary: string;
  bestSummary?: string | null;
  tip: string;
  saveSummary: string;
  saveState?: SessionSaveState;
  extraNotes?: string[];
  retryLabel?: string;
  statsLabel?: string;
  statsTo?: string;
  onRetry: () => void;
  // Progress System Phase 2
  xpGranted?: number;
  leveledUp?: boolean;
  fromLevel?: number;
  toLevel?: number;
  newlyUnlockedAchievements?: string[];
}

export function SessionResultSummary({
  testId,
  title,
  metrics,
  previousSummary,
  bestSummary,
  tip,
  saveSummary,
  saveState,
  extraNotes,
  retryLabel = "Повторить",
  statsLabel = "К статистике",
  statsTo = "/stats",
  onRetry,
  // Progress System Phase 2
  xpGranted,
  leveledUp = false,
  fromLevel,
  toLevel,
  newlyUnlockedAchievements = []
}: SessionResultSummaryProps) {
  return (
    <section className="result-box" data-testid={testId}>
      {/* Level Up Banner */}
      {leveledUp && (
        <div className="level-up-banner" data-testid="session-level-up">
          <span className="level-up-banner-icon">⭐</span>
          <div className="level-up-banner-content">
            <span className="level-up-banner-title">Новый уровень!</span>
            <span className="level-up-banner-subtitle">
              {fromLevel} → {toLevel}
            </span>
          </div>
        </div>
      )}

      {/* XP Gain Display */}
      {xpGranted !== undefined && xpGranted > 0 && !leveledUp && (
        <div className="xp-gain-display" data-testid="session-xp-gain">
          <span className="xp-gain-icon">⚡</span>
          <span className="xp-gain-value">+{xpGranted} XP</span>
        </div>
      )}

      {/* Achievement Unlocked Display */}
      {newlyUnlockedAchievements.length > 0 && (
        <div className="achievement-unlocked-display" data-testid="session-achievement-unlocked">
          <span className="achievement-unlocked-icon">🏆</span>
          <div className="achievement-unlocked-content">
            <span className="achievement-unlocked-title">Достижение разблокировано!</span>
            {newlyUnlockedAchievements.map((achievementId) => (
              <span key={achievementId} className="achievement-unlocked-name">
                {getAchievementName(achievementId)}
              </span>
            ))}
          </div>
        </div>
      )}

      <h3>{title}</h3>

      {metrics.map((metric) => (
        <p key={metric.label} data-testid={metric.testId}>
          {metric.label}: {metric.value}
        </p>
      ))}

      <p>{previousSummary}</p>
      {bestSummary ? <p>{bestSummary}</p> : null}
      <p className="status-line">{tip}</p>
      {saveState ? <p data-testid={saveState.testId}>{saveState.text}</p> : null}
      <p>{saveSummary}</p>

      {extraNotes?.map((note) => (
        <p key={note} className="status-line">
          {note}
        </p>
      ))}

      <div className="action-row">
        <button
          type="button"
          className="btn-secondary"
          onClick={onRetry}
          data-testid={`${testId}-retry-btn`}
        >
          {retryLabel}
        </button>
        <Link className="btn-ghost" to={statsTo} data-testid={`${testId}-stats-link`}>
          {statsLabel}
        </Link>
      </div>
    </section>
  );
}

// Helper function to get achievement display name
function getAchievementName(achievementId: string): string {
  const names: Record<string, string> = {
    streak_3: "Ритм 3 дня",
    streak_7: "Неделя",
    sessions_10: "Первые шаги",
    sessions_50: "Активный",
    sessions_100: "Ветеран"
  };
  return names[achievementId] || achievementId;
}
