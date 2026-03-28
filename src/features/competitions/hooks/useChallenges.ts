import { useState, useEffect, useCallback } from "react";
import { challengeRepository } from "../../../entities/challenge/challengeRepository";
import type { UserChallenge } from "../../../shared/types/classes";
import type { User } from "../../../shared/types/domain";

/**
 * Хук для управления вызовами (PvP challenges)
 */
export function useChallenges(userId: string | null) {
  const [challenges, setChallenges] = useState<UserChallenge[]>([]);
  const [incoming, setIncoming] = useState<UserChallenge[]>([]);
  const [outgoing, setOutgoing] = useState<UserChallenge[]>([]);
  const [active, setActive] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setChallenges([]);
      setIncoming([]);
      setOutgoing([]);
      setActive([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [all, incomingList, outgoingList, activeList] = await Promise.all([
        challengeRepository.listByUser(userId),
        challengeRepository.listIncoming(userId),
        challengeRepository.listOutgoing(userId),
        challengeRepository.listActive(userId)
      ]);
      setChallenges(all);
      setIncoming(incomingList);
      setOutgoing(outgoingList);
      setActive(activeList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Отправить вызов
  const sendChallenge = useCallback(async (
    challengedId: string,
    modeId: UserChallenge["modeId"],
    durationMinutes: number
  ) => {
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const challenge: UserChallenge = {
      id: "",
      challengerId: userId,
      challengedId,
      modeId,
      durationMinutes,
      status: "pending",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };

    await challengeRepository.create(challenge);
    await refresh();
  }, [userId, refresh]);

  // Ответить на вызов
  const respondToChallenge = useCallback(async (
    challengeId: string,
    accept: boolean
  ) => {
    await challengeRepository.respond(challengeId, accept);
    await refresh();
  }, [refresh]);

  // Завершить вызов
  const completeChallenge = useCallback(async (
    challengeId: string,
    challengerScore: number,
    challengedScore: number
  ) => {
    await challengeRepository.complete(challengeId, challengerScore, challengedScore);
    await refresh();
  }, [refresh]);

  // Отменить вызов
  const cancelChallenge = useCallback(async (challengeId: string) => {
    await challengeRepository.cancel(challengeId);
    await refresh();
  }, [refresh]);

  return {
    challenges,
    incoming,
    outgoing,
    active,
    loading,
    error,
    sendChallenge,
    respondToChallenge,
    completeChallenge,
    cancelChallenge,
    refresh
  };
}

/**
 * Хук для отправки вызова (используется в модалках)
 */
export function useSendChallenge(onSuccess?: () => void) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendChallenge = useCallback(async (
    challengerId: string,
    challengedId: string,
    modeId: UserChallenge["modeId"],
    durationMinutes: number
  ) => {
    try {
      setSending(true);
      setError(null);

      const challenge: UserChallenge = {
        id: "",
        challengerId,
        challengedId,
        modeId,
        durationMinutes,
        status: "pending",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      };

      await challengeRepository.create(challenge);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send challenge");
      throw err;
    } finally {
      setSending(false);
    }
  }, [onSuccess]);

  return { sendChallenge, sending, error };
}

/**
 * Хук для получения входящих вызовов
 */
export function useIncomingChallenges(userId: string | null) {
  const [challenges, setChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setChallenges([]);
      setLoading(false);
      return;
    }

    let mounted = true;

    void (async () => {
      try {
        const incoming = await challengeRepository.listIncoming(userId);
        if (mounted) {
          setChallenges(incoming);
        }
      } catch (err) {
        console.error("Failed to load incoming challenges:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return { challenges, loading };
}
