import { db } from "../../db/database";
import type { UserChallenge } from "../../shared/types/classes";
import { notificationRepository } from "../notification/notificationRepository";

/**
 * Repository для PvP вызовов
 * Работает с IndexedDB (локально)
 * В будущем будет синхронизация с backend
 */
export const challengeRepository = {
  /**
   * Создать новый вызов
   */
  async create(challenge: UserChallenge): Promise<UserChallenge> {
    const id = `challenge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newChallenge: UserChallenge = {
      ...challenge,
      id,
      createdAt: new Date().toISOString(),
    };
    await db.challenges.put(newChallenge);

    // Создать уведомление для получателя
    await notificationRepository.create(
      challenge.challengedId,
      "challenge_received",
      "Новый вызов!",
      `Вам бросили вызов в ${challenge.modeId}`,
      undefined,
      id
    );

    return newChallenge;
  },

  /**
   * Получить все вызовы для пользователя
   */
  async listByUser(userId: string): Promise<UserChallenge[]> {
    const all = await db.challenges.toArray();
    return all
      .filter((c) => c.challengerId === userId || c.challengedId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Получить входящие вызовы (где пользователь - тот, кого вызвали)
   */
  async listIncoming(userId: string): Promise<UserChallenge[]> {
    const all = await db.challenges.toArray();
    return all
      .filter((c) => c.challengedId === userId && c.status === "pending")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Получить исходящие вызовы (где пользователь - инициатор)
   */
  async listOutgoing(userId: string): Promise<UserChallenge[]> {
    const all = await db.challenges.toArray();
    return all
      .filter((c) => c.challengerId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Ответить на вызов (принять/отклонить)
   */
  async respond(challengeId: string, accept: boolean): Promise<UserChallenge | null> {
    const challenge = await db.challenges.get(challengeId);
    if (!challenge) {
      return null;
    }

    const updated: UserChallenge = {
      ...challenge,
      status: accept ? "accepted" : "declined",
      respondedAt: new Date().toISOString(),
    };

    await db.challenges.put(updated);
    return updated;
  },

  /**
   * Завершить вызов (записать результаты)
   */
  async complete(
    challengeId: string,
    challengerScore: number,
    challengedScore: number
  ): Promise<UserChallenge | null> {
    const challenge = await db.challenges.get(challengeId);
    if (!challenge) {
      return null;
    }

    const winnerId = challengerScore > challengedScore ? challenge.challengerId : challenge.challengedId;

    const updated: UserChallenge = {
      ...challenge,
      challengerScore,
      challengedScore,
      winnerId: challengerScore === challengedScore ? undefined : winnerId,
      status: "completed",
      completedAt: new Date().toISOString(),
    };

    await db.challenges.put(updated);
    return updated;
  },

  /**
   * Отменить вызов
   */
  async cancel(challengeId: string): Promise<void> {
    await db.challenges.delete(challengeId);
  },

  /**
   * Очистить старые вызовы (старше 7 дней)
   */
  async cleanup(): Promise<void> {
    const all = await db.challenges.toArray();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const challenge of all) {
      const createdAt = new Date(challenge.createdAt).getTime();
      if (createdAt < weekAgo && challenge.status === "pending") {
        await db.challenges.delete(challenge.id);
      }
    }
  },

  /**
   * Получить активные вызовы (принятые, но не завершённые)
   */
  async listActive(userId: string): Promise<UserChallenge[]> {
    const all = await db.challenges.toArray();
    return all
      .filter(
        (c) =>
          (c.challengerId === userId || c.challengedId === userId) &&
          c.status === "accepted"
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
};
