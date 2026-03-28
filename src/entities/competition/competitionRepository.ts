import { db } from "../../db/database";
import type {
  Competition,
  CompetitionParticipant,
  CompetitionTeam,
  CompetitionType,
  CompetitionStatus,
  CompetitionMode
} from "../../shared/types/classes";
import type { TrainingModeId, User } from "../../shared/types/domain";
import { createId } from "../../shared/lib/id";

/**
 * Repository для соревнований (Competitions)
 * Работает с IndexedDB (локально)
 * В будущем будет синхронизация с backend
 * 
 * Поддерживает:
 * - Создание соревнований
 * - Управление участниками
 * - Live-обновления результатов (для sync режима)
 * - Лидерборды
 */
export const competitionRepository = {
  /**
   * Создать новое соревнование
   */
  async create(
    name: string,
    type: CompetitionType,
    mode: CompetitionMode,
    organizerId: string,
    modeId: TrainingModeId,
    durationMinutes: number,
    startTime: string,
    endTime: string
  ): Promise<Competition> {
    const id = createId();
    const competition: Competition = {
      id,
      name,
      type,
      mode,
      status: "pending",
      organizerId,
      organizerType: "user",
      modeId,
      durationMinutes,
      startTime,
      endTime,
      participants: [],
      leaderboard: [],
      settings: {
        visibility: "private",
        inviteOnly: true,
        allowSpectators: false,
        showLiveLeaderboard: true,
        xpBonus: {
          winner: 50,
          second: 30,
          third: 20
        },
        achievementRewards: true,
        requireCamera: false,
        strictMode: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.competitions.put(competition);
    return competition;
  },

  /**
   * Получить соревнование по ID
   */
  async getById(id: string): Promise<Competition | undefined> {
    return db.competitions.get(id);
  },

  /**
   * Получить все соревнования для пользователя
   */
  async listByUser(userId: string): Promise<Competition[]> {
    const all = await db.competitions.toArray();
    return all
      .filter((c) =>
        c.participants.some((p) => p.userId === userId) ||
        c.organizerId === userId
      )
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  },

  /**
   * Получить активные соревнования (где пользователь участвует)
   */
  async listActive(userId: string): Promise<Competition[]> {
    const all = await db.competitions.toArray();
    const now = new Date().toISOString();
    return all
      .filter(
        (c) =>
          c.status === "active" &&
          c.startTime <= now &&
          c.endTime >= now &&
          c.participants.some((p) => p.userId === userId)
      )
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  },

  /**
   * Получить предстоящие соревнования
   */
  async listUpcoming(userId: string): Promise<Competition[]> {
    const all = await db.competitions.toArray();
    const now = new Date().toISOString();
    return all
      .filter(
        (c) =>
          c.status === "pending" &&
          c.startTime > now &&
          c.participants.some((p) => p.userId === userId)
      )
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  },

  /**
   * Присоединить участника к соревнованию
   */
  async joinParticipant(
    competitionId: string,
    user: User,
    classId?: string
  ): Promise<Competition> {
    const competition = await db.competitions.get(competitionId);
    if (!competition) {
      throw new Error(`Competition ${competitionId} not found`);
    }

    const existing = competition.participants.find((p) => p.userId === user.id);
    if (existing) {
      throw new Error(`User ${user.id} already joined`);
    }

    const participant: CompetitionParticipant = {
      userId: user.id,
      classId,
      joinedAt: new Date().toISOString(),
      status: "joined"
    };

    competition.participants.push(participant);
    competition.updatedAt = new Date().toISOString();

    await db.competitions.put(competition);
    return competition;
  },

  /**
   * Обновить статус участника
   */
  async updateParticipantStatus(
    competitionId: string,
    userId: string,
    status: CompetitionParticipant["status"]
  ): Promise<Competition | null> {
    const competition = await db.competitions.get(competitionId);
    if (!competition) {
      return null;
    }

    const participant = competition.participants.find((p) => p.userId === userId);
    if (!participant) {
      return null;
    }

    participant.status = status;
    competition.updatedAt = new Date().toISOString();

    await db.competitions.put(competition);
    return competition;
  },

  /**
   * Отправить результат участника
   */
  async submitResult(
    competitionId: string,
    userId: string,
    score: number,
    accuracy?: number,
    reactionTimeMs?: number
  ): Promise<Competition | null> {
    const competition = await db.competitions.get(competitionId);
    if (!competition) {
      return null;
    }

    const participant = competition.participants.find((p) => p.userId === userId);
    if (!participant) {
      return null;
    }

    participant.score = score;
    participant.accuracy = accuracy;
    participant.reactionTimeMs = reactionTimeMs;
    participant.status = "finished";

    // Обновляем лидерборд
    competition.leaderboard = this._recalculateLeaderboard(competition.participants);
    competition.updatedAt = new Date().toISOString();

    await db.competitions.put(competition);
    return competition;
  },

  /**
   * Обновить live-результат (для sync режима)
   */
  async updateLiveScore(
    competitionId: string,
    userId: string,
    liveScore: number
  ): Promise<Competition | null> {
    const competition = await db.competitions.get(competitionId);
    if (!competition) {
      return null;
    }

    const participant = competition.participants.find((p) => p.userId === userId);
    if (!participant) {
      return null;
    }

    participant.liveScore = liveScore;
    participant.lastPingAt = new Date().toISOString();
    participant.status = "playing";

    // Обновляем live-лидерборд
    competition.leaderboard = this._recalculateLeaderboard(
      competition.participants,
      true
    );
    competition.updatedAt = new Date().toISOString();

    await db.competitions.put(competition);
    return competition;
  },

  /**
   * Завершить соревнование
   */
  async finish(competitionId: string): Promise<Competition | null> {
    const competition = await db.competitions.get(competitionId);
    if (!competition) {
      return null;
    }

    competition.status = "completed";

    // Определяем победителей
    const sorted = [...competition.leaderboard].sort((a, b) => b.score - a.score);
    competition.winners = sorted.slice(0, 3).map((entry) => entry.participantId);

    // Начисляем бонусы XP
    const bonuses = [
      competition.settings.xpBonus.winner,
      competition.settings.xpBonus.second,
      competition.settings.xpBonus.third
    ];

    for (let i = 0; i < Math.min(sorted.length, 3); i++) {
      const entry = sorted[i];
      const participant = competition.participants.find(
        (p) => p.userId === entry.participantId
      );
      if (participant) {
        participant.xpEarned = bonuses[i];
      }
    }

    competition.updatedAt = new Date().toISOString();

    await db.competitions.put(competition);
    return competition;
  },

  /**
   * Отменить соревнование
   */
  async cancel(competitionId: string): Promise<void> {
    const competition = await db.competitions.get(competitionId);
    if (competition) {
      competition.status = "cancelled";
      competition.updatedAt = new Date().toISOString();
      await db.competitions.put(competition);
    }
  },

  /**
   * Удалить соревнование
   */
  async delete(competitionId: string): Promise<void> {
    await db.competitions.delete(competitionId);
  },

  /**
   * Получить лидерборд соревнования
   */
  async getLeaderboard(competitionId: string): Promise<Competition["leaderboard"]> {
    const competition = await db.competitions.get(competitionId);
    if (!competition) {
      return [];
    }
    return competition.leaderboard;
  },

  /**
   * Создать команду для соревнования
   */
  async createTeam(
    competitionId: string,
    name: string,
    memberIds: string[],
    classId?: string,
    captainId?: string
  ): Promise<CompetitionTeam> {
    const competition = await db.competitions.get(competitionId);
    if (!competition) {
      throw new Error(`Competition ${competitionId} not found`);
    }

    const team: CompetitionTeam = {
      id: createId(),
      name,
      classId,
      memberIds,
      captainId
    };

    if (!competition.teams) {
      competition.teams = [];
    }
    competition.teams.push(team);
    competition.updatedAt = new Date().toISOString();

    await db.competitions.put(competition);
    return team;
  },

  /**
   * Пересчитать лидерборд
   */
  _recalculateLeaderboard(
    participants: CompetitionParticipant[],
    useLiveScore = false
  ): Array<{
    rank: number;
    participantId: string;
    name: string;
    score: number;
    accuracy?: number;
    reactionTimeMs?: number;
    xpEarned?: number;
    trend?: "up" | "down" | "steady";
  }> {
    const scored = participants
      .filter((p) => p.score !== undefined || (useLiveScore && p.liveScore !== undefined))
      .map((p) => ({
        participantId: p.userId,
        name: p.userId, // TODO: заменить на имя пользователя
        score: useLiveScore ? (p.liveScore ?? 0) : (p.score ?? 0),
        accuracy: p.accuracy,
        reactionTimeMs: p.reactionTimeMs,
        xpEarned: p.xpEarned
      }))
      .sort((a, b) => b.score - a.score);

    return scored.map((entry, index) => ({
      rank: index + 1,
      ...entry,
      trend: index === 0 ? "steady" : undefined
    }));
  },

  /**
   * Очистить завершённые соревнования (старше 30 дней)
   */
  async cleanup(): Promise<void> {
    const all = await db.competitions.toArray();
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    for (const competition of all) {
      if (
        competition.status === "completed" &&
        new Date(competition.updatedAt).getTime() < monthAgo
      ) {
        await db.competitions.delete(competition.id);
      }
    }
  }
};
