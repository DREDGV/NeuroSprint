import { useEffect, useState } from "react";
import { competitionRepository } from "../../../entities/competition/competitionRepository";
import type { Competition } from "../../../shared/types/classes";

interface LiveLeaderboardProps {
  competitionId: string;
  limit?: number;
  showFull?: boolean;
  className?: string;
}

/**
 * Live-лидерборд для соревнования
 * Автоматически обновляется каждые 5 секунд
 */
export function LiveLeaderboard({
  competitionId,
  limit = 10,
  showFull = false,
  className = ""
}: LiveLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<Competition["leaderboard"]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadLeaderboard = async () => {
    try {
      const lb = await competitionRepository.getLeaderboard(competitionId);
      setLeaderboard(lb);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();

    // Авто-обновление каждые 5 секунд
    const interval = setInterval(loadLeaderboard, 5000);

    return () => clearInterval(interval);
  }, [competitionId]);

  const displayedLeaderboard = showFull ? leaderboard : leaderboard.slice(0, limit);

  const getMedal = (rank: number): string => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className={`live-leaderboard ${className}`} data-testid="live-leaderboard">
      <div className="live-leaderboard-header">
        <h3>📊 Лидерборд</h3>
        {lastUpdated && (
          <span className="last-updated">
            Обновлено: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {loading && leaderboard.length === 0 ? (
        <div className="live-leaderboard-loading">
          <div className="loading-spinner" />
          <p>Загрузка...</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="live-leaderboard-empty">
          <p>Пока нет результатов</p>
        </div>
      ) : (
        <div className="live-leaderboard-list">
          {displayedLeaderboard.map((entry, index) => (
            <div
              key={entry.participantId}
              className={`live-leaderboard-item ${index < 3 ? "is-medal" : ""}`}
            >
              <div className="live-leaderboard-rank">
                <span className="medal-icon">{getMedal(entry.rank)}</span>
              </div>

              <div className="live-leaderboard-info">
                <div className="live-leaderboard-name">{entry.name}</div>
                {entry.className && (
                  <div className="live-leaderboard-class">{entry.className}</div>
                )}
              </div>

              <div className="live-leaderboard-score">
                <span className="score-value">{entry.score}</span>
                {entry.accuracy !== undefined && (
                  <span className="score-accuracy">
                    {(entry.accuracy! * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              {entry.trend && (
                <div className={`live-leaderboard-trend trend-${entry.trend}`}>
                  {entry.trend === "up" ? "↑" : entry.trend === "down" ? "↓" : "→"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!showFull && leaderboard.length > limit && (
        <div className="live-leaderboard-footer">
          + ещё {leaderboard.length - limit} участников
        </div>
      )}
    </div>
  );
}
