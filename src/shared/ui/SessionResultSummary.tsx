import { Link } from "react-router-dom";

interface SessionResultMetric {
  label: string;
  value: string;
  testId?: string;
  trend?: "up" | "down" | "neutral";
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
          <div className="xp-gain-content">
            <span className="xp-gain-icon">⚡</span>
            <span className="xp-gain-label">Получено XP</span>
          </div>
          <span className="xp-gain-value">+{xpGranted}</span>
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

      <div className="result-summary-head">
        <div className="result-summary-copy">
          <p className="result-summary-kicker">Итог сессии</p>
          <h3>{title}</h3>
        </div>
        {metrics[0] ? (
          <div className="result-summary-highlight" aria-hidden="true">
            <span>{metrics[0].label}</span>
            <strong>{metrics[0].value}</strong>
          </div>
        ) : null}
      </div>

      <div className="result-summary-metrics">
        {metrics.map((metric, index) => (
          <article 
            key={metric.label} 
            className={`result-summary-metric${metric.trend ? ` has-trend is-${metric.trend}` : ""}`}
            data-testid={metric.testId}
          >
            <span>{metric.label}</span>
            <strong>: {metric.value}</strong>
            {metric.trend && (
              <span className="metric-trend-icon" aria-hidden="true">
                {metric.trend === "up" ? "↑" : metric.trend === "down" ? "↓" : "→"}
              </span>
            )}
          </article>
        ))}
      </div>

      <div className="result-summary-insights">
        <article className="result-summary-card">
          <span className="result-summary-card-label">Сравнение</span>
          <p>{previousSummary}</p>
        </article>
        {bestSummary ? (
          <article className="result-summary-card is-accent">
            <span className="result-summary-card-label">Личный ориентир</span>
            <p>{bestSummary}</p>
          </article>
        ) : null}
      </div>

      <article className="result-summary-next-step">
        <span className="result-summary-kicker">Следующий шаг</span>
        <p>{tip}</p>
      </article>

      <div className="result-summary-save">
        {saveState ? <p className="result-summary-save-state" data-testid={saveState.testId}>{saveState.text}</p> : null}
        <p className="result-summary-save-text">{saveSummary}</p>
      </div>

      {extraNotes?.length ? (
        <div className="result-summary-notes">
          {extraNotes.map((note) => (
            <p key={note} className="status-line">
              {note}
            </p>
          ))}
        </div>
      ) : null}

      <div className="action-row result-summary-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={onRetry}
          data-testid={`${testId}-retry-btn`}
        >
          {retryLabel}
        </button>
        <Link className="btn-secondary" to={statsTo} data-testid={`${testId}-stats-link`}>
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
    sessions_100: "Ветеран",
    skill_attention_50: "Мастер внимания I",
    skill_attention_80: "Мастер внимания II",
    skill_memory_50: "Мастер памяти I",
    skill_memory_80: "Мастер памяти II",
    skill_reaction_50: "Мастер скорости I",
    skill_reaction_80: "Мастер скорости II",
    skill_math_50: "Мастер счёта I",
    skill_math_80: "Мастер счёта II",
    skill_logic_50: "Мастер логики I",
    skill_logic_80: "Мастер логики II"
  };
  return names[achievementId] || achievementId;
}
