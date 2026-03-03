export type Mode =
  | "classic"
  | "timed"
  | "reverse"
  | "sprint_math"
  | "reaction"
  | "n_back"
  | "memory_grid"
  | "decision_rush"
  | "pattern_recognition";
export type AppRole = "teacher" | "student" | "home";
export type TrainingModuleId =
  | "schulte"
  | "sprint_math"
  | "reaction"
  | "n_back"
  | "memory_grid"
  | "decision_rush"
  | "pattern_recognition";
export type TrainingModeId =
  | "classic_plus"
  | "timed_plus"
  | "reverse"
  | "sprint_add_sub"
  | "sprint_mixed"
  | "reaction_signal"
  | "reaction_stroop"
  | "reaction_pair"
  | "reaction_number"
  | "nback_1"
  | "nback_1_4x4"
  | "nback_2"
  | "nback_2_4x4"
  | "nback_3"
  | "memory_grid_classic"
  | "memory_grid_classic_4x4"
  | "memory_grid_rush"
  | "memory_grid_rush_4x4"
  | "decision_kids"
  | "decision_standard"
  | "decision_pro"
  | "pattern_classic"
  | "pattern_timed"
  | "pattern_progressive"
  | "pattern_learning"
  | "pattern_multi";
export type AdaptiveSource = "auto" | "manual" | "legacy";
export type TrainingPresetId =
  | "easy"
  | "standard"
  | "intense"
  | "legacy";
export type GridSize = 3 | 4 | 5 | 6;
export type TimeLimitSec = 30 | 45 | 60 | 90 | 120;
export type SpawnStrategy = "same_cell" | "random_cell";
export type GroupMetric = "score" | "accuracy" | "speed";
export type ComparePeriod = number | "all";
export type CompareBandMetric = "score" | "duration_sec";
export type SchulteThemeId =
  | "classic_bw"
  | "contrast"
  | "soft"
  | "rainbow"
  | "kid_candy"
  | "kid_ocean"
  | "kid_space"
  | "kid_comics";

export interface SchulteThemeConfig {
  boardBg: string;
  cellBg: string;
  numberColor: string;
  highlightColor: string;
  successColor: string;
  errorColor: string;
}

export interface AudioSettings {
  muted: boolean;
  volume: number;
  startEnd: boolean;
  click: boolean;
  correct: boolean;
  error: boolean;
}

export interface User {
  id: string;
  name: string;
  role: AppRole;
  createdAt: string;
}

export interface Difficulty {
  gridSize: GridSize;
  numbersCount: number;
  mode: Mode;
  timeLimitSec?: TimeLimitSec;
  errorPenalty?: number;
  hintsEnabled?: boolean;
  spawnStrategy?: SpawnStrategy;
  sprintTierId?: "kids" | "standard" | "pro";
  sprintMaxOperand?: number;
  sprintAllowNegative?: boolean;
  sprintAllowDivision?: boolean;
  sprintAutoEnter?: boolean;
  nBackLevel?: 1 | 2;
  decisionLevel?: "kids" | "standard" | "pro";
  decisionStimulusIntervalMs?: number;
  shiftEnabled?: boolean;
  shiftIntervalSec?: number;
  shiftSwaps?: number;
  timedBaseClear?: boolean;
}

export interface Session {
  id: string;
  userId: string;
  taskId: "schulte" | "sprint_math" | "reaction" | "n_back" | "decision_rush" | "memory_grid" | "pattern_recognition";
  mode: Mode;
  moduleId: TrainingModuleId;
  modeId: TrainingModeId;
  level: number;
  presetId: TrainingPresetId;
  adaptiveSource: AdaptiveSource;
  timestamp: string;
  localDate: string;
  durationMs: number;
  score: number;
  accuracy: number;
  speed: number;
  errors: number;
  correctCount?: number;
  effectiveCorrect?: number;
  reactionAvgMs?: number;
  reactionP90Ms?: number;
  trialsTotal?: number;
  bestCombo?: number;
  points?: number;
  visualThemeId?: SchulteThemeId;
  audioEnabledSnapshot?: AudioSettings;
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

export interface SprintMathDailyPoint {
  date: string;
  throughput: number;
  accuracy: number;
  avgScore: number;
  count: number;
}

export interface ReactionDailyPoint {
  date: string;
  avgReactionMs: number;
  bestReactionMs: number;
  accuracy: number;
  avgScore: number;
  count: number;
}

export interface NBackDailyPoint {
  date: string;
  accuracy: number;
  avgScore: number;
  speed: number;
  count: number;
}

export interface DecisionRushDailyPoint {
  date: string;
  accuracy: number;
  avgScore: number;
  reactionP90Ms: number;
  bestComboAvg: number;
  count: number;
}

export interface DailyProgressSummary {
  date: string;
  sessionsTotal: number;
  classicCount: number;
  timedCount: number;
  reverseCount: number;
  bestClassicDurationMs: number | null;
  bestTimedScore: number | null;
  bestReverseDurationMs: number | null;
  avgAccuracy: number | null;
}

export interface TrainingModule {
  id: TrainingModuleId;
  title: string;
  description: string;
  status: "active" | "coming_soon";
}

export interface TrainingMode {
  id: TrainingModeId;
  moduleId: TrainingModuleId;
  title: string;
  description: string;
}

export interface TrainingSetup {
  presetId: TrainingPresetId;
  gridSize: GridSize;
  timeLimitSec: TimeLimitSec;
  errorPenalty: number;
  hintsEnabled: boolean;
  spawnStrategy: SpawnStrategy;
  visualThemeId: SchulteThemeId;
  customTheme: Partial<SchulteThemeConfig> | null;
  autoAdjust: boolean;
  manualLevel: number | null;
  shiftEnabled?: boolean;
  shiftIntervalSec?: number;
  shiftSwaps?: number;
  timedBaseClear?: boolean;
}

export interface UserModeProfile {
  id: string;
  userId: string;
  moduleId: TrainingModuleId;
  modeId: TrainingModeId;
  level: number;
  autoAdjust: boolean;
  manualLevel: number | null;
  lastDecisionReason: string | null;
  lastEvaluatedAt: string | null;
  updatedAt: string;
}

export interface AdaptiveDecision {
  userId: string;
  moduleId: TrainingModuleId;
  modeId: TrainingModeId;
  previousLevel: number;
  nextLevel: number;
  delta: -1 | 0 | 1;
  avgAccuracy: number;
  scoreGrowthPct: number;
  scoreDropPct: number;
  reason: string;
  applied: boolean;
  source: AdaptiveSource;
  evaluatedAt: string;
  windowSize: number;
}

export interface ClassGroup {
  id: string;
  name: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: string;
}

export interface UserPreference {
  id: string;
  userId: string;
  schulteThemeId: SchulteThemeId;
  schulteCustomTheme: Partial<SchulteThemeConfig> | null;
  audioSettings: AudioSettings;
  updatedAt: string;
}

export interface GroupStatsPoint {
  date: string;
  avg: number;
  best: number;
  worst: number;
  count: number;
}

export interface GroupStatsSummary {
  best: number | null;
  avg: number | null;
  worst: number | null;
  sessionsTotal: number;
  membersTotal: number;
}

export interface GroupLevelBucket {
  level: number;
  count: number;
}

export interface GroupStatsResult {
  summary: GroupStatsSummary;
  trend: GroupStatsPoint[];
  levelDistribution: GroupLevelBucket[];
}

export interface UserPercentileResult {
  userId: string;
  metric: GroupMetric;
  percentile: number | null;
  userValue: number | null;
  sampleSize: number;
}

export interface UserMetricPoint {
  userId: string;
  value: number;
  sessions: number;
}

export interface ModeMetricSummary {
  best: number | null;
  avg: number | null;
  worst: number | null;
  sessionsTotal: number;
  usersTotal: number;
}

export interface ModeMetricSnapshot {
  summary: ModeMetricSummary;
  byUser: UserMetricPoint[];
}

export interface DailyCompareBandPoint {
  date: string;
  p25: number;
  median: number;
  p75: number;
  usersCount: number;
  sessionsCount: number;
}

export type DailyChallengeStatus = "pending" | "completed";

export interface DailyChallenge {
  id: string;
  userId: string;
  localDate: string;
  moduleId: TrainingModuleId;
  modeId: TrainingModeId;
  status: DailyChallengeStatus;
  requiredAttempts: number;
  title: string;
  description: string;
  createdAt: string;
  completedAt: string | null;
}

export interface DailyChallengeAttempt {
  id: string;
  challengeId: string;
  userId: string;
  sessionId: string;
  moduleId: TrainingModuleId;
  modeId: TrainingModeId;
  localDate: string;
  createdAt: string;
}

export interface DailyChallengeProgress {
  challenge: DailyChallenge;
  attemptsCount: number;
  remainingAttempts: number;
  completed: boolean;
  launchPath: string;
  progressLabel: string;
}

export interface DailyChallengeHistoryItem {
  challengeId: string;
  localDate: string;
  modeId: TrainingModeId;
  modeTitle: string;
  status: DailyChallengeStatus;
  requiredAttempts: number;
  attemptsCount: number;
  completedAt: string | null;
}

export interface DailyChallengeCompletionSummary {
  period: ComparePeriod;
  total: number;
  completed: number;
  pending: number;
  completionRatePct: number;
}

export interface DailyChallengeStreakSummary {
  period: ComparePeriod;
  currentStreakDays: number;
  bestStreakDays: number;
  completedDays: number;
}

export interface DailyChallengeTrendPoint {
  localDate: string;
  completed: boolean;
  completionPct: number;
  attemptsCount: number;
}

export interface ModeRecommendation {
  modeId: TrainingModeId;
  reason: string;
  confidence: number;
}

export interface PatternDailyPoint {
  date: string;
  accuracy: number;
  avgScore: number;
  avgReactionTimeMs: number;
  bestStreak: number;
  count: number;
}

export interface AppSettings {
  timedDefaultLimitSec: TimeLimitSec;
  timedErrorPenalty: number;
  dailyGoalSessions: number;
}
