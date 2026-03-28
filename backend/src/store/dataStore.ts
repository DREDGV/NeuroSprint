import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { createId } from "../lib/id";
import type {
  AuthUser,
  ChallengeStatus,
  Competition,
  CompetitionLeaderboardEntry,
  CompetitionParticipant,
  CompetitionStatus,
  CreateChallengeInput,
  CreateCompetitionInput,
  ParticipantStatus,
  UserChallenge
} from "../types";

interface PersistedState {
  competitions: Competition[];
  challenges: UserChallenge[];
}

function defaultCompetitionSettings(): Competition["settings"] {
  return {
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
  };
}

function clampNumber(value: number, min: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, value);
}

function recalculateLeaderboard(
  participants: CompetitionParticipant[],
  useLiveScore = false
): CompetitionLeaderboardEntry[] {
  const previousRanks = new Map<string, number>();
  participants.forEach((participant, index) => {
    previousRanks.set(participant.userId, index + 1);
  });

  const sorted = participants
    .filter((participant) =>
      useLiveScore
        ? participant.liveScore !== undefined || participant.score !== undefined
        : participant.score !== undefined
    )
    .map((participant) => ({
      participantId: participant.userId,
      name: participant.name || participant.userId,
      score: useLiveScore ? participant.liveScore ?? participant.score ?? 0 : participant.score ?? 0,
      accuracy: participant.accuracy,
      reactionTimeMs: participant.reactionTimeMs,
      xpEarned: participant.xpEarned
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return (right.accuracy ?? 0) - (left.accuracy ?? 0);
    });

  return sorted.map((entry, index) => {
    const currentRank = index + 1;
    const previousRank = previousRanks.get(entry.participantId);
    const trend =
      previousRank === undefined
        ? "steady"
        : previousRank > currentRank
          ? "up"
          : previousRank < currentRank
            ? "down"
            : "steady";

    return {
      rank: currentRank,
      ...entry,
      trend
    };
  });
}

class NeuroSprintDataStore {
  private readonly filePath: string;
  private readonly competitions = new Map<string, Competition>();
  private readonly challenges = new Map<string, UserChallenge>();
  private readonly ready: Promise<void>;
  private saveQueue = Promise.resolve();

  constructor() {
    this.filePath = process.env.DATA_FILE
      ? path.resolve(process.cwd(), process.env.DATA_FILE)
      : path.resolve(process.cwd(), "data", "state.json");
    this.ready = this.load();
  }

  private async load(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<PersistedState>;

      for (const competition of parsed.competitions ?? []) {
        this.competitions.set(competition.id, this.refreshCompetitionStatus(competition));
      }

      for (const challenge of parsed.challenges ?? []) {
        this.challenges.set(challenge.id, challenge);
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw error;
      }
      await this.persist();
    }
  }

  private async persist(): Promise<void> {
    const snapshot: PersistedState = {
      competitions: Array.from(this.competitions.values()),
      challenges: Array.from(this.challenges.values())
    };
    await writeFile(this.filePath, JSON.stringify(snapshot, null, 2), "utf8");
  }

  private async save(): Promise<void> {
    this.saveQueue = this.saveQueue.then(() => this.persist());
    await this.saveQueue;
  }

  private refreshCompetitionStatus(competition: Competition): Competition {
    const now = Date.now();
    const start = new Date(competition.startTime).getTime();
    const end = new Date(competition.endTime).getTime();

    let nextStatus: CompetitionStatus = competition.status;
    if (competition.status !== "cancelled") {
      if (now >= end) {
        nextStatus = "completed";
      } else if (now >= start) {
        nextStatus = "active";
      } else {
        nextStatus = "pending";
      }
    }

    if (competition.status === nextStatus) {
      return competition;
    }

    return {
      ...competition,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };
  }

  private async getCompetitionOrThrow(competitionId: string): Promise<Competition> {
    await this.ready;
    const competition = this.competitions.get(competitionId);
    if (!competition) {
      throw new Error(`Competition ${competitionId} not found`);
    }
    const refreshed = this.refreshCompetitionStatus(competition);
    if (refreshed !== competition) {
      this.competitions.set(refreshed.id, refreshed);
      await this.save();
    }
    return refreshed;
  }

  async listCompetitionsByUser(userId: string): Promise<Competition[]> {
    await this.ready;
    const items = Array.from(this.competitions.values())
      .map((competition) => this.refreshCompetitionStatus(competition))
      .filter(
        (competition) =>
          competition.organizerId === userId ||
          competition.participants.some((participant) => participant.userId === userId)
      )
      .sort((left, right) => {
        return new Date(right.startTime).getTime() - new Date(left.startTime).getTime();
      });

    return items;
  }

  async listActiveCompetitions(userId: string): Promise<Competition[]> {
    const items = await this.listCompetitionsByUser(userId);
    return items.filter((competition) => competition.status === "active");
  }

  async listUpcomingCompetitions(userId: string): Promise<Competition[]> {
    const items = await this.listCompetitionsByUser(userId);
    return items.filter((competition) => competition.status === "pending");
  }

  async createCompetition(input: CreateCompetitionInput, organizer: AuthUser): Promise<Competition> {
    await this.ready;

    const now = new Date().toISOString();
    const competition: Competition = {
      id: createId("competition"),
      name: input.name.trim(),
      type: input.type,
      mode: input.mode,
      status: "pending",
      organizerId: organizer.userId,
      organizerName: organizer.name,
      organizerType: "user",
      modeId: input.modeId,
      durationMinutes: clampNumber(input.durationMinutes, 1, 5),
      startTime: input.startTime,
      endTime: input.endTime,
      participants: [],
      leaderboard: [],
      settings: defaultCompetitionSettings(),
      createdAt: now,
      updatedAt: now
    };

    this.competitions.set(competition.id, competition);
    await this.save();
    return competition;
  }

  async getCompetition(competitionId: string): Promise<Competition | null> {
    try {
      return await this.getCompetitionOrThrow(competitionId);
    } catch {
      return null;
    }
  }

  async joinCompetition(competitionId: string, user: AuthUser, classId?: string): Promise<Competition> {
    const competition = await this.getCompetitionOrThrow(competitionId);
    const existing = competition.participants.find((participant) => participant.userId === user.userId);
    if (existing) {
      return competition;
    }

    const participant: CompetitionParticipant = {
      userId: user.userId,
      name: user.name,
      classId,
      joinedAt: new Date().toISOString(),
      status: "joined"
    };

    const updated: Competition = {
      ...competition,
      participants: [...competition.participants, participant],
      updatedAt: new Date().toISOString()
    };

    this.competitions.set(updated.id, updated);
    await this.save();
    return updated;
  }

  async updateParticipantStatus(
    competitionId: string,
    userId: string,
    status: ParticipantStatus
  ): Promise<Competition | null> {
    const competition = await this.getCompetition(competitionId);
    if (!competition) {
      return null;
    }

    const participants = competition.participants.map((participant) =>
      participant.userId === userId
        ? {
            ...participant,
            status,
            lastPingAt: new Date().toISOString()
          }
        : participant
    );

    const updated: Competition = {
      ...competition,
      participants,
      updatedAt: new Date().toISOString()
    };

    this.competitions.set(updated.id, updated);
    await this.save();
    return updated;
  }

  async updateLiveScore(
    competitionId: string,
    user: AuthUser,
    liveScore: number,
    accuracy?: number,
    reactionTimeMs?: number
  ): Promise<Competition | null> {
    const competition = await this.getCompetition(competitionId);
    if (!competition) {
      return null;
    }

    const participants = competition.participants.map((participant) =>
      participant.userId === user.userId
        ? {
            ...participant,
            name: user.name ?? participant.name,
            status: "playing" as const,
            liveScore,
            accuracy: accuracy ?? participant.accuracy,
            reactionTimeMs: reactionTimeMs ?? participant.reactionTimeMs,
            lastPingAt: new Date().toISOString()
          }
        : participant
    );

    const leaderboard = recalculateLeaderboard(participants, true);
    const updated: Competition = {
      ...competition,
      participants,
      leaderboard,
      updatedAt: new Date().toISOString()
    };

    this.competitions.set(updated.id, updated);
    await this.save();
    return updated;
  }

  async submitCompetitionResult(
    competitionId: string,
    user: AuthUser,
    score: number,
    accuracy?: number,
    reactionTimeMs?: number
  ): Promise<Competition | null> {
    const competition = await this.getCompetition(competitionId);
    if (!competition) {
      return null;
    }

    const participants = competition.participants.map((participant) =>
      participant.userId === user.userId
        ? {
            ...participant,
            name: user.name ?? participant.name,
            status: "finished" as const,
            score,
            accuracy,
            reactionTimeMs,
            liveScore: score,
            lastPingAt: new Date().toISOString()
          }
        : participant
    );

    const leaderboard = recalculateLeaderboard(participants);
    const updated: Competition = {
      ...competition,
      participants,
      leaderboard,
      updatedAt: new Date().toISOString()
    };

    this.competitions.set(updated.id, updated);
    await this.save();
    return updated;
  }

  async getLeaderboard(competitionId: string): Promise<CompetitionLeaderboardEntry[]> {
    const competition = await this.getCompetition(competitionId);
    return competition?.leaderboard ?? [];
  }

  async finishCompetition(competitionId: string): Promise<Competition | null> {
    const competition = await this.getCompetition(competitionId);
    if (!competition) {
      return null;
    }

    const sorted = [...competition.leaderboard].sort((left, right) => right.score - left.score);
    const updated: Competition = {
      ...competition,
      status: "completed",
      winners: sorted.slice(0, 3).map((entry) => entry.participantId),
      updatedAt: new Date().toISOString()
    };

    this.competitions.set(updated.id, updated);
    await this.save();
    return updated;
  }

  async cancelCompetition(competitionId: string): Promise<Competition | null> {
    const competition = await this.getCompetition(competitionId);
    if (!competition) {
      return null;
    }

    const updated: Competition = {
      ...competition,
      status: "cancelled",
      updatedAt: new Date().toISOString()
    };

    this.competitions.set(updated.id, updated);
    await this.save();
    return updated;
  }

  async listChallengesByUser(userId: string): Promise<UserChallenge[]> {
    await this.ready;
    return Array.from(this.challenges.values())
      .filter(
        (challenge) => challenge.challengerId === userId || challenge.challengedId === userId
      )
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }

  async listIncomingChallenges(userId: string): Promise<UserChallenge[]> {
    const items = await this.listChallengesByUser(userId);
    return items.filter(
      (challenge) => challenge.challengedId === userId && challenge.status === "pending"
    );
  }

  async listOutgoingChallenges(userId: string): Promise<UserChallenge[]> {
    const items = await this.listChallengesByUser(userId);
    return items.filter((challenge) => challenge.challengerId === userId);
  }

  async listActiveChallenges(userId: string): Promise<UserChallenge[]> {
    const items = await this.listChallengesByUser(userId);
    return items.filter((challenge) => challenge.status === "accepted");
  }

  async createChallenge(input: CreateChallengeInput, challenger: AuthUser): Promise<UserChallenge> {
    await this.ready;
    const challenge: UserChallenge = {
      id: createId("challenge"),
      challengerId: challenger.userId,
      challengerName: challenger.name,
      challengedId: input.challengedId,
      challengedName: input.challengedName,
      challengedClassId: input.challengedClassId,
      modeId: input.modeId,
      durationMinutes: clampNumber(input.durationMinutes, 1, 5),
      status: "pending",
      expiresAt: input.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };

    this.challenges.set(challenge.id, challenge);
    await this.save();
    return challenge;
  }

  async respondToChallenge(
    challengeId: string,
    status: Extract<ChallengeStatus, "accepted" | "declined">
  ): Promise<UserChallenge | null> {
    await this.ready;
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return null;
    }

    const updated: UserChallenge = {
      ...challenge,
      status,
      respondedAt: new Date().toISOString()
    };

    this.challenges.set(updated.id, updated);
    await this.save();
    return updated;
  }

  async completeChallenge(
    challengeId: string,
    challengerScore: number,
    challengedScore: number
  ): Promise<UserChallenge | null> {
    await this.ready;
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return null;
    }

    const winnerId =
      challengerScore === challengedScore
        ? undefined
        : challengerScore > challengedScore
          ? challenge.challengerId
          : challenge.challengedId;

    const updated: UserChallenge = {
      ...challenge,
      challengerScore,
      challengedScore,
      winnerId,
      status: "completed",
      completedAt: new Date().toISOString()
    };

    this.challenges.set(updated.id, updated);
    await this.save();
    return updated;
  }

  async cancelChallenge(challengeId: string): Promise<boolean> {
    await this.ready;
    const deleted = this.challenges.delete(challengeId);
    if (deleted) {
      await this.save();
    }
    return deleted;
  }
}

export const dataStore = new NeuroSprintDataStore();
