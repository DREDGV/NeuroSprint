import { useMemo, useState } from "react";
import type { TrainingModeId, SkillProfileId } from "../shared/types/domain";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  classId?: string;
  className?: string;
  score: number;
  accuracy?: number;
  reactionTimeMs?: number;
  xpEarned?: number;
  trend?: "up" | "down" | "steady";
}

type LeaderboardPeriod = "day" | "week" | "month" | "all";

interface LeaderboardWidgetProps {
  entries: LeaderboardEntry[];
  period?: LeaderboardPeriod;
  modeId?: TrainingModeId;
  skillId?: SkillProfileId;
  onPeriodChange?: (period: LeaderboardPeriod) => void;
  onModeChange?: (modeId: TrainingModeId) => void;
  isLoading?: boolean;
  className?: string;
}

const PERIODS: Array<{ id: LeaderboardPeriod; label: string }> = [
  { id: "day", label: "День" },
  { id: "week", label: "Неделя" },
  { id: "month", label: "Месяц" },
  { id: "all", label: "Всё время" }
];

const TREND_ICONS: Record<"up" | "down" | "steady", string> = {
  up: "↑",
  down: "↓",
  steady: "→"
};

const TREND_COLORS: Record<"up" | "down" | "steady", string> = {
  up: "#10b981",
  down: "#ef4444",
  steady: "#6b7280"
};

/**
 * Виджет лидерборда с фильтрами
 * Показывает рейтинг учеников с возможностью фильтрации
 */
export function LeaderboardWidget({
  entries,
  period = "week",
  modeId,
  skillId,
  onPeriodChange,
  onModeChange,
  isLoading = false,
  className = ""
}: LeaderboardWidgetProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>(period);
  const [showTopOnly, setShowTopOnly] = useState(false);

  const handlePeriodChange = (newPeriod: LeaderboardPeriod) => {
    setSelectedPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  const displayedEntries = useMemo(() => {
    if (showTopOnly) {
      return entries.slice(0, 10);
    }
    return entries;
  }, [entries, showTopOnly]);

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { background: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#fff" };
    if (rank === 2) return { background: "linear-gradient(135deg, #9ca3af, #6b7280)", color: "#fff" };
    if (rank === 3) return { background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff" };
    return undefined;
  };

  return (
    <div className={`leaderboard-widget ${className}`} data-testid="leaderboard-widget">
      <div className="leaderboard-header">
        <h3>🏆 Лидерборд</h3>
        
        {/* Фильтры периода */}
        <div className="leaderboard-filters">
          <div className="period-selector">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`period-btn${selectedPeriod === p.id ? " is-active" : ""}`}
                onClick={() => handlePeriodChange(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="leaderboard-loading">
          <div className="loading-spinner" />
          <p>Загрузка лидерборда...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="leaderboard-empty">
          <p>Пока нет данных для отображения</p>
        </div>
      ) : (
        <>
          <div className="leaderboard-table-container">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th className="rank-col">#</th>
                  <th className="name-col">Ученик</th>
                  <th className="score-col">Счёт</th>
                  <th className="accuracy-col">Точность</th>
                  <th className="xp-col">XP</th>
                  <th className="trend-col">Тренд</th>
                </tr>
              </thead>
              <tbody>
                {displayedEntries.map((entry) => {
                  const rankStyle = getRankStyle(entry.rank);
                  return (
                    <tr
                      key={entry.userId}
                      className={`leaderboard-row${entry.rank <= 3 ? " is-top" : ""}`}
                    >
                      <td className="rank-cell">
                        <span
                          className="rank-badge"
                          style={rankStyle}
                        >
                          {entry.rank}
                        </span>
                      </td>
                      <td className="name-cell">
                        <div className="participant-info">
                          <span className="participant-name">{entry.name}</span>
                          {entry.className && (
                            <span className="participant-class">{entry.className}</span>
                          )}
                        </div>
                      </td>
                      <td className="score-cell">
                        <strong className="score-value">{entry.score}</strong>
                      </td>
                      <td className="accuracy-cell">
                        {entry.accuracy !== undefined ? (
                          <span className="accuracy-value">
                            {(entry.accuracy * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="xp-cell">
                        {entry.xpEarned !== undefined ? (
                          <span className="xp-value">🏆 {entry.xpEarned}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="trend-cell">
                        {entry.trend && (
                          <span
                            className="trend-icon"
                            style={{ color: TREND_COLORS[entry.trend] }}
                            title={entry.trend === "up" ? "Поднимается" : entry.trend === "down" ? "Спускается" : "Без изменений"}
                          >
                            {TREND_ICONS[entry.trend]}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {entries.length > 10 && (
            <div className="leaderboard-footer">
              <button
                type="button"
                className="btn-toggle-top"
                onClick={() => setShowTopOnly(!showTopOnly)}
              >
                {showTopOnly ? `Показать все (${entries.length})` : "Показать топ-10"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
