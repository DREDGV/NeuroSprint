export type CompetitionType = "pvp" | "team" | "tournament" | "challenge";
export type CompetitionStatus = "pending" | "active" | "completed" | "cancelled";
export type CompetitionMode = "async" | "sync" | "hybrid";
export type ParticipantStatus = "joined" | "ready" | "playing" | "finished" | "abandoned";
export type ChallengeStatus = "pending" | "accepted" | "declined" | "completed" | "cancelled";

export interface AuthUser {
  userId: string;
  name?: string;
  role?: string;
}

export interface CompetitionParticipant {
  userId: string;
  name?: string;
  classId?: string;
  joinedAt: string;
  status: ParticipantStatus;
  score?: number;
  accuracy?: number;
  reactionTimeMs?: number;
  xpEarned?: number;
  liveScore?: number;
  lastPingAt?: string;
}

export interface CompetitionLeaderboardEntry {
  rank: number;
  participantId: string;
  name: string;
  score: number;
  accuracy?: number;
  reactionTimeMs?: number;
  xpEarned?: number;
  trend?: "up" | "down" | "steady";
}

export interface CompetitionSettings {
  visibility: "private" | "class" | "school" | "public";
  inviteOnly: boolean;
  allowSpectators: boolean;
  showLiveLeaderboard: boolean;
  xpBonus: {
    winner: number;
    second: number;
    third: number;
  };
  achievementRewards: boolean;
  requireCamera: boolean;
  strictMode: boolean;
}

export interface Competition {
  id: string;
  name: string;
  type: CompetitionType;
  mode: CompetitionMode;
  status: CompetitionStatus;
  organizerId: string;
  organizerName?: string;
  organizerType: "user" | "class" | "system";
  modeId: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  participants: CompetitionParticipant[];
  leaderboard: CompetitionLeaderboardEntry[];
  winners?: string[];
  settings: CompetitionSettings;
  createdAt: string;
  updatedAt: string;
}

export interface UserChallenge {
  id: string;
  challengerId: string;
  challengerName?: string;
  challengedId: string;
  challengedName?: string;
  challengedClassId?: string;
  modeId: string;
  durationMinutes: number;
  status: ChallengeStatus;
  expiresAt: string;
  challengerScore?: number;
  challengedScore?: number;
  winnerId?: string;
  createdAt: string;
  respondedAt?: string;
  completedAt?: string;
}

export interface CreateCompetitionInput {
  name: string;
  type: CompetitionType;
  mode: CompetitionMode;
  modeId: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
}

export interface CreateChallengeInput {
  challengedId: string;
  challengedName?: string;
  challengedClassId?: string;
  modeId: string;
  durationMinutes: number;
  expiresAt?: string;
}
