import { useState, useEffect, useCallback } from "react";
import { competitionRepository } from "../../../entities/competition/competitionRepository";
import type { Competition, CompetitionParticipant } from "../../../shared/types/classes";
import type { User } from "../../../shared/types/domain";

/**
 * Хук для управления соревнованиями
 */
export function useCompetitions(userId: string | null) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [active, setActive] = useState<Competition[]>([]);
  const [upcoming, setUpcoming] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCompetitions([]);
      setActive([]);
      setUpcoming([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [all, activeList, upcomingList] = await Promise.all([
        competitionRepository.listByUser(userId),
        competitionRepository.listActive(userId),
        competitionRepository.listUpcoming(userId)
      ]);
      setCompetitions(all);
      setActive(activeList);
      setUpcoming(upcomingList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load competitions");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Создать соревнование
  const createCompetition = useCallback(async (
    name: string,
    type: Competition["type"],
    mode: Competition["mode"],
    modeId: Competition["modeId"],
    durationMinutes: number,
    startTime: string,
    endTime: string
  ) => {
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const competition = await competitionRepository.create(
      name,
      type,
      mode,
      userId,
      modeId,
      durationMinutes,
      startTime,
      endTime
    );

    await refresh();
    return competition;
  }, [userId, refresh]);

  // Присоединиться к соревнованию
  const joinCompetition = useCallback(async (
    competitionId: string,
    user: User,
    classId?: string
  ) => {
    await competitionRepository.joinParticipant(competitionId, user, classId);
    await refresh();
  }, [refresh]);

  // Отправить результат
  const submitResult = useCallback(async (
    competitionId: string,
    userId: string,
    score: number,
    accuracy?: number,
    reactionTimeMs?: number
  ) => {
    await competitionRepository.submitResult(
      competitionId,
      userId,
      score,
      accuracy,
      reactionTimeMs
    );
    await refresh();
  }, [refresh]);

  // Обновить live-результат
  const updateLiveScore = useCallback(async (
    competitionId: string,
    userId: string,
    liveScore: number
  ) => {
    await competitionRepository.updateLiveScore(competitionId, userId, liveScore);
    await refresh();
  }, [refresh]);

  // Завершить соревнование
  const finishCompetition = useCallback(async (competitionId: string) => {
    await competitionRepository.finish(competitionId);
    await refresh();
  }, [refresh]);

  // Отменить соревнование
  const cancelCompetition = useCallback(async (competitionId: string) => {
    await competitionRepository.cancel(competitionId);
    await refresh();
  }, [refresh]);

  return {
    competitions,
    active,
    upcoming,
    loading,
    error,
    createCompetition,
    joinCompetition,
    submitResult,
    updateLiveScore,
    finishCompetition,
    cancelCompetition,
    refresh
  };
}

/**
 * Хук для получения конкретного соревнования
 */
export function useCompetition(competitionId: string | null) {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!competitionId) {
      setCompetition(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    void (async () => {
      try {
        setLoading(true);
        const comp = await competitionRepository.getById(competitionId);
        if (mounted) {
          setCompetition(comp || null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load competition");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [competitionId]);

  return { competition, loading, error };
}

/**
 * Хук для лидерборда соревнования
 */
export function useCompetitionLeaderboard(competitionId: string | null) {
  const [leaderboard, setLeaderboard] = useState<Competition["leaderboard"]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!competitionId) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }

    let mounted = true;

    void (async () => {
      try {
        setLoading(true);
        const lb = await competitionRepository.getLeaderboard(competitionId);
        if (mounted) {
          setLeaderboard(lb);
        }
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [competitionId]);

  return { leaderboard, loading };
}
