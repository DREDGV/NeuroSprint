import { useEffect, useState, useCallback } from "react";
import type { Competition } from "../../../shared/types/classes";
import { competitionRepository } from "../../../entities/competition/competitionRepository";

interface LiveCompetitionProps {
  competitionId: string;
  userId: string;
  onScoreUpdate?: (score: number) => void;
  onFinished?: () => void;
  className?: string;
}

/**
 * Компонент для участия в live-соревновании (real-time)
 * Показывает таймер, текущий счёт и позицию в лидерборде
 */
export function LiveCompetition({
  competitionId,
  userId,
  onScoreUpdate,
  onFinished,
  className = ""
}: LiveCompetitionProps) {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [userScore, setUserScore] = useState<number>(0);
  const [userRank, setUserRank] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Загрузка соревнования
  useEffect(() => {
    let mounted = true;

    void (async () => {
      const comp = await competitionRepository.getById(competitionId);
      if (mounted && comp) {
        setCompetition(comp);
        
        // Найти пользователя в участниках
        const participant = comp.participants.find((p) => p.userId === userId);
        if (participant) {
          setUserScore(participant.liveScore || 0);
          setUserRank(comp.leaderboard.findIndex((e) => e.participantId === userId) + 1 || 0);
        }

        // Рассчитать оставшееся время
        const now = new Date().getTime();
        const endTime = new Date(comp.endTime).getTime();
        const remaining = Math.max(0, endTime - now);
        setTimeRemaining(remaining);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [competitionId, userId]);

  // Таймер обратного отсчёта
  useEffect(() => {
    if (timeRemaining <= 0 || !competition) {
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const next = prev - 1000;
        if (next <= 0) {
          setIsFinished(true);
          setIsPlaying(false);
          onFinished?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, competition, onFinished]);

  // Обновление счёта в реальном времени
  const updateScore = useCallback(async (score: number) => {
    if (!competition || isFinished) {
      return;
    }

    setUserScore(score);
    onScoreUpdate?.(score);

    // Отправить в repository для обновления
    await competitionRepository.updateLiveScore(competitionId, userId, score);
    
    // Перезагрузить лидерборд для обновления ранга
    const updated = await competitionRepository.getById(competitionId);
    if (updated) {
      setCompetition(updated);
      const rank = updated.leaderboard.findIndex((e) => e.participantId === userId) + 1;
      setUserRank(rank || 0);
    }
  }, [competitionId, userId, competition, isFinished, onScoreUpdate]);

  // Старт соревнования
  const startCompetition = useCallback(async () => {
    if (!competition) {
      return;
    }

    await competitionRepository.updateParticipantStatus(competitionId, userId, "playing");
    setIsPlaying(true);
  }, [competition, competitionId, userId]);

  // Форматирование времени
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const isTimeRunningOut = timeRemaining < 30000; // Меньше 30 секунд

  if (!competition) {
    return (
      <div className={`live-competition ${className}`} data-testid="live-competition">
        <div className="live-competition-loading">
          <div className="loading-spinner" />
          <p>Загрузка соревнования...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`live-competition ${className}`} data-testid="live-competition">
      <div className="live-competition-header">
        <h2>{competition.name}</h2>
        <div className={`live-competition-timer ${isTimeRunningOut ? "is-urgent" : ""}`}>
          <span className="timer-icon">⏱️</span>
          <span className="timer-value">{formatTime(timeRemaining)}</span>
        </div>
      </div>

      <div className="live-competition-stats">
        <div className="live-stat-card">
          <span className="live-stat-icon">🎯</span>
          <div>
            <div className="live-stat-value">{userScore}</div>
            <div className="live-stat-label">Ваш счёт</div>
          </div>
        </div>

        <div className="live-stat-card">
          <span className="live-stat-icon">📊</span>
          <div>
            <div className="live-stat-value">#{userRank}</div>
            <div className="live-stat-label">Ваша позиция</div>
          </div>
        </div>

        <div className="live-stat-card">
          <span className="live-stat-icon">👥</span>
          <div>
            <div className="live-stat-value">{competition.participants.length}</div>
            <div className="live-stat-label">Участников</div>
          </div>
        </div>
      </div>

      {!isPlaying && !isFinished && timeRemaining > 0 && (
        <div className="live-competition-start">
          <button
            type="button"
            className="btn-start-competition btn-primary"
            onClick={startCompetition}
          >
            🚀 Начать соревнование
          </button>
        </div>
      )}

      {isPlaying && (
        <div className="live-competition-active">
          <p className="competition-instruction">
            Проходите тренажёр {competition.modeId} и набирайте очки!
          </p>
          <p className="competition-note">
            Результаты обновляются в реальном времени
          </p>
        </div>
      )}

      {isFinished && (
        <div className="live-competition-finished">
          <h3>🏁 Соревнование завершено!</h3>
          <p className="final-score">
            Ваш результат: <strong>{userScore}</strong> очков
          </p>
          <p className="final-rank">
            Итоговая позиция: <strong>#{userRank}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
