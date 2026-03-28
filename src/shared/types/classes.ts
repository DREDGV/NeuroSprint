/**
 * Типы для системы Классов и Соревнований
 * 
 * Архитектура:
 * - School (опционально) → ClassGroup → Students
 * - ClassGroup → Competitions (PvP, Team, Tournament)
 * - Students → Participation → Results
 */

import type { TrainingModeId, SkillProfileId, Session } from "./domain";

// ==================== КЛАССЫ ====================

export type ClassRole = "teacher" | "student" | "observer";

export interface ClassGroup {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string; // userId учителя
  memberIds: string[]; // userId учеников
  settings: ClassSettings;
  stats?: ClassStats; // кэшированная статистика
}

export interface ClassSettings {
  visibility: "private" | "school" | "public";
  allowSelfJoin: boolean;
  joinCode?: string; // код для вступления (например, "MATH2026")
  maxMembers?: number;
  allowedModes: TrainingModeId[]; // какие тренажёры доступны
}

export interface ClassStats {
  totalMembers: number;
  activeMembers: number; // за последние 7 дней
  avgLevel: number;
  avgXP: number;
  totalSessions: number;
  topSkill: SkillProfileId;
  weeklyGrowth: number; // % прирост XP за неделю
  lastUpdated: string;
  sessions?: Session[]; // для тепловой карты
}

// ==================== СОРЕВНОВАНИЯ ====================

export type CompetitionType = "pvp" | "team" | "tournament" | "challenge";
export type CompetitionStatus = "pending" | "active" | "completed" | "cancelled";
export type CompetitionMode = "async" | "sync" | "hybrid";

export interface Competition {
  id: string;
  name: string;
  type: CompetitionType;
  mode: CompetitionMode;
  status: CompetitionStatus;
  
  // Организатор
  organizerId: string; // userId или classId
  organizerType: "user" | "class" | "system";
  
  // Параметры
  modeId: TrainingModeId; // какой тренажёр
  durationMinutes: number;
  startTime: string;
  endTime: string;
  
  // Участники
  participants: CompetitionParticipant[];
  teams?: CompetitionTeam[]; // для team/tournament
  
  // Результаты
  leaderboard: CompetitionLeaderboardEntry[];
  winners?: string[]; // userId победителей
  
  // Настройки
  settings: CompetitionSettings;
  
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionParticipant {
  userId: string;
  classId?: string;
  joinedAt: string;
  status: "joined" | "ready" | "playing" | "finished" | "abandoned";
  
  // Результаты (заполняются после игры)
  score?: number;
  accuracy?: number;
  reactionTimeMs?: number;
  xpEarned?: number;
  
  // Для sync режима
  liveScore?: number; // обновляется в реальном времени
  lastPingAt?: string;
}

export interface CompetitionTeam {
  id: string;
  name: string;
  classId?: string;
  memberIds: string[];
  captainId?: string;
  
  // Результаты команды
  totalScore?: number;
  avgAccuracy?: number;
  rank?: number;
}

export interface CompetitionLeaderboardEntry {
  rank: number;
  participantId: string; // userId или teamId
  name: string;
  classId?: string;
  className?: string;
  
  score: number;
  accuracy?: number;
  reactionTimeMs?: number;
  xpEarned?: number;
  
  // Для команд
  teamId?: string;
  teamName?: string;
  teamMembers?: number;
  
  trend?: "up" | "down" | "steady"; // изменение позиции
}

export interface CompetitionSettings {
  // Доступ
  visibility: "private" | "class" | "school" | "public";
  inviteOnly: boolean;
  allowedClassIds?: string[];
  
  // Формат
  maxParticipants?: number;
  allowSpectators: boolean;
  showLiveLeaderboard: boolean;
  
  // Награды
  xpBonus: {
    winner: number;
    second: number;
    third: number;
  };
  achievementRewards: boolean;
  
  // Anti-cheat
  requireCamera: boolean; // для будущих видео-соревнований
  strictMode: boolean;
}

// ==================== ВЫЗОВЫ (PvP) ====================

export type ChallengeStatus = "pending" | "accepted" | "declined" | "completed" | "cancelled";

export interface UserChallenge {
  id: string;
  challengerId: string; // кто вызвал
  challengedId: string; // кого вызвали
  challengedClassId?: string; // или весь класс
  
  modeId: TrainingModeId;
  durationMinutes: number;
  
  status: ChallengeStatus;
  expiresAt: string;
  
  // Результаты
  challengerScore?: number;
  challengedScore?: number;
  winnerId?: string;
  
  createdAt: string;
  respondedAt?: string;
  completedAt?: string;
}

// ==================== СЕЗОННЫЙ РЕЙТИНГ ====================

export interface SeasonRating {
  seasonId: string;
  userId: string;
  classId?: string;
  
  rating: number; // ELO или аналог
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  
  bestStreak: number;
  currentStreak: number;
  
  rank: number; // место в сезоне
  division: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  
  lastUpdated: string;
}

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "upcoming" | "active" | "completed";
  
  totalParticipants: number;
  totalCompetitions: number;
  
  // Топ участники
  topPlayers: SeasonRating[];
  topClasses: ClassSeasonRating[];
}

export interface ClassSeasonRating {
  classId: string;
  className: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  rank: number;
}

// ==================== УВЕДОМЛЕНИЯ ====================

export type NotificationType = 
  | "challenge_received"
  | "challenge_accepted"
  | "competition_starting"
  | "competition_finished"
  | "rank_changed"
  | "achievement_unlocked"
  | "team_invite";

export interface CompetitionNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  
  relatedCompetitionId?: string;
  relatedChallengeId?: string;
  relatedClassId?: string;
  
  isRead: boolean;
  createdAt: string;
}
