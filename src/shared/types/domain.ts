export type Mode = "classic" | "timed";

export interface User {
  id: string;
  name: string;
  createdAt: string;
}

export interface Difficulty {
  gridSize: 5;
  numbersCount: 25;
  mode: Mode;
  timeLimitSec?: 30 | 60 | 90;
  errorPenalty?: number;
}

export interface Session {
  id: string;
  userId: string;
  taskId: "schulte";
  mode: Mode;
  timestamp: string;
  localDate: string;
  durationMs: number;
  score: number;
  accuracy: number;
  speed: number;
  errors: number;
  correctCount?: number;
  effectiveCorrect?: number;
  difficulty: Difficulty;
}

export interface ClassicDailyPoint {
  date: string;
  bestDurationMs: number;
  avgDurationMs: number;
  count: number;
}

export interface TimedDailyPoint {
  date: string;
  effectivePerMinute: number;
  avgScore: number;
  count: number;
}

export interface AppSettings {
  timedDefaultLimitSec: 30 | 60 | 90;
  timedErrorPenalty: number;
}

