export type Mode =
  | "classic"
  | "timed"
  | "reverse"
  | "sprint_math"
  | "reaction"
  | "n_back"
  | "memory_grid"
  | "spatial_memory"
  | "decision_rush"
  | "memory_match"
  | "pattern_recognition";
export type AppRole = "teacher" | "student" | "home" | "admin";
export type TrainingModuleId =
  | "schulte"
  | "sprint_math"
  | "reaction"
  | "n_back"
  | "memory_grid"
  | "spatial_memory"
  | "decision_rush"
  | "memory_match"
  | "pattern_recognition";
export type SkillProfileId = "attention" | "memory" | "reaction" | "math" | "logic";
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
  | "memory_grid_classic_kids"
  | "memory_grid_classic_pro"
  | "memory_grid_classic_kids_4x4"
  | "memory_grid_classic_pro_4x4"
  | "memory_grid_rush"
  | "memory_grid_rush_4x4"
  | "memory_grid_rush_kids"
  | "memory_grid_rush_pro"
  | "memory_grid_rush_kids_4x4"
  | "memory_grid_rush_pro_4x4"
  | "spatial_memory_classic"
  | "decision_kids"
  | "decision_standard"
  | "decision_pro"
  | "memory_match_classic"
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
  lastActivity?: string; // ISO timestamp последнего действия
  totalSessions?: number; // Всего проведено сессий
  totalTimeSec?: number; // Общее время в тренажёрах (сек)
  sessionsByModule?: Record<TrainingModuleId, number>; // Сессии по тренажёрам
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
  taskId: "schulte" | "sprint_math" | "reaction" | "n_back" | "decision_rush" | "memory_grid" | "spatial_memory" | "memory_match" | "pattern_recognition";
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

export interface MemoryGridDailyPoint {
  date: string;
  accuracy: number;
  avgScore: number;
  avgRecallTimeMs: number;
  spanMaxAvg: number;
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

// ============================================================================
// Daily Training System (Phase 1 — Progress System)
// ============================================================================

export type DailyTrainingStatus = "pending" | "completed";

/**
 * Ежедневный тренировочный прогресс пользователя.
 * Хранит снимок цели на день и факт выполнения.
 */
export interface DailyTraining {
  id: string;                    // "userId:localDate"
  userId: string;
  localDate: string;             // "YYYY-MM-DD"
  goalSessions: number;          // Цель на этот день (снимок из настроек на момент создания)
  completedSessions: number;     // Фактически завершено сессий
  status: DailyTrainingStatus;
  completedAt: string | null;    // Когда достигнута цель
  createdAt: string;             // Когда создан рекорд
  updatedAt: string;             // Последнее обновление
}

/**
 * Связь между DailyTraining и Session.
 * Предотвращает дублирование и позволяет быстро получить сессии дня.
 */
export interface DailyTrainingSessionLink {
  id: string;
  dailyTrainingId: string;       // Ссылка на DailyTraining.id
  userId: string;
  sessionId: string;             // Ссылка на Session.id
  moduleId: TrainingModuleId;
  modeId: TrainingModeId;
  score: number;                 // Снимок результата сессии
  durationMs: number;            // Снимок длительности
  createdAt: string;
}

/**
 * Прогресс пользователя за день (расширенная версия для UI).
 */
export interface DailyTrainingProgress {
  training: DailyTraining;
  sessions: DailyTrainingSessionLink[];
  completed: boolean;
  progressPercent: number;       // 0-100
  remainingSessions: number;
  launchPath: string;            // Куда вести для продолжения
}

/**
 * Элемент истории Daily Training.
 */
export interface DailyTrainingHistoryItem {
  dailyTrainingId: string;
  localDate: string;
  goalSessions: number;
  completedSessions: number;
  status: DailyTrainingStatus;
  completedAt: string | null;
  sessionsCount: number;
  totalDurationMs: number;
  bestScore: number;
}

/**
 * Сводка выполнения за период.
 */
export interface DailyTrainingCompletionSummary {
  period: ComparePeriod;
  totalDays: number;             // Сколько дней было с сессиями
  completedDays: number;         // Сколько дней цель достигнута
  pendingDays: number;           // Сколько дней цель не достигнута
  completionRatePct: number;     // Процент завершённых дней
  totalSessions: number;         // Всего сессий за период
  avgSessionsPerDay: number;     // Среднее сессий в день
}

/**
 * Streak-сводка (серия подряд идущих завершённых дней).
 */
export interface DailyTrainingStreakSummary {
  period: ComparePeriod;
  currentStreakDays: number;     // Текущая серия
  bestStreakDays: number;        // Лучшая серия за период
  completedDays: number;         // Всего завершённых дней
}

/**
 * Точка тренда для визуализации.
 */
export interface DailyTrainingTrendPoint {
  localDate: string;
  completed: boolean;
  completedSessions: number;
  goalSessions: number;
  progressPct: number;
  sessionsCount: number;
}

/**
 * Heatmap-ячейка для календаря.
 */
export interface DailyTrainingHeatmapCell {
  localDate: string;
  completed: boolean;
  sessionsCount: number;
  intensity: 0 | 1 | 2 | 3 | 4;  // 0 = none, 1-4 = уровень активности
}

// ============================================================================
// Progress System — Phase 2: Levels + Achievements
// ============================================================================

/**
 * Уровень пользователя с XP и прогрессом.
 */
export interface UserLevel {
  id: string;                    // userId
  userId: string;
  level: number;                 // Текущий уровень (1+)
  currentXP: number;             // XP на текущем уровне
  totalXP: number;               // Всего XP за всё время
  xpToNextLevel: number;         // Сколько XP нужно до следующего уровня
  lastLevelUpAt: string | null;  // Когда было последнее повышение
  updatedAt: string;             // Последнее обновление
}

/**
 * Достижение (описание в каталоге).
 */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;                  // Emoji или SVG icon
  category: AchievementCategory;
  condition: AchievementCondition;
  order: number;                 // Порядок отображения
  hidden: boolean;               // Скрытое достижение (не показывать пока не получено)
}

export type AchievementCategory =
  | "streak"      // Серии дней
  | "sessions"    // Количество сессий
  | "skill"       // Навыки/модули
  | "daily"       // Дневные цели
  | "special";   // Специальные

export interface AchievementCondition {
  type: AchievementConditionType;
  value: number;
  moduleId?: TrainingModuleId;  // Для skill-достижений
}

export type AchievementConditionType =
  | "streak_days"         // Серия дней подряд
  | "sessions_total"      // Всего сессий
  | "sessions_today"      // Сессий за день
  | "module_sessions"     // Сессий в конкретном модуле
  | "all_modules"         // Пройти все модули
  | "level_reached"       // Достичь уровня
  | "perfect_day";        // Идеальный день (goalSessions >= 5)

/**
 * Полученное пользователем достижение.
 */
export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  progress: number;        // Текущий прогресс (0-100 или абсолютное значение)
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Источники XP.
 */
export type XPSource =
  | "session"              // Завершённая сессия
  | "daily_complete"       // Completion дня
  | "streak_bonus"         // Бонус за серию
  | "achievement"          // Получение достижения
  | "level_up";            // Повышение уровня

/**
 * История получения XP.
 */
export interface XPLog {
  id: string;
  userId: string;
  source: XPSource;
  amount: number;          // Сколько XP получено
  sessionId?: string;      // Для session
  achievementId?: string;  // Для achievement
  streakDays?: number;     // Для streak_bonus
  createdAt: string;
}

/**
 * Конфигурация XP системы.
 */
export interface XPConfig {
  baseXPPerSession: number;           // Базовое XP за сессию
  dailyCompleteBonus: number;         // Бонус за completion дня
  streakBonusMultiplier: number;      // Множитель за streak (дополнительно к 1.0)
  maxStreakMultiplier: number;        // Максимальный множитель streak
  xpToNextLevelBase: number;          // Базовое XP для уровня 1→2
  xpToNextLevelGrowth: number;        // Рост XP для каждого уровня
}

/**
 * Прогресс пользователя с уровнем и достижениями.
 */
export interface UserProgress {
  level: UserLevel;
  achievements: UserAchievement[];
  availableAchievements: Achievement[];  // Какие ещё можно получить
  recentXPLogs: XPLog[];                 // Последние получения XP
}

/**
 * Событие для проверки достижений.
 */
export interface AchievementEvent {
  type: "session_completed" | "daily_completed" | "streak_updated";
  userId: string;
  sessionId?: string;
  moduleId?: TrainingModuleId;
  streakDays?: number;
  sessionsToday?: number;
  totalSessions?: number;
}

// ============================================================================
// Progress System Phase 3 — Skill Map + Strength/Weakness Analysis
// ============================================================================

/**
 * Процентиль навыка пользователя (сравнение с другими).
 */
export interface SkillPercentile {
  skillId: SkillProfileId;
  userScore: number;
  percentile: number;              // 0-100 (какой % пользователей ниже)
  rank: SkillRank;
  sampleSize: number;
  source: "virtual" | "server";    // Для миграции на сервер
}

export type SkillRank =
  | "top_1%"      // Легендарный
  | "top_5%"      // Эпический
  | "top_10%"     // Редкий
  | "top_25%"     // Необычный
  | "top_50%"     // Обычный
  | "bottom_50%"; // Ниже среднего

/**
 * Бенчмарки навыка для сравнения.
 */
export interface SkillBenchmark {
  skillId: SkillProfileId;
  avg: number;
  median: number;
  top25: number;    // 75-й процентиль
  top10: number;    // 90-й процентиль
  sampleSize: number;
  lastUpdated: string;
  source: "virtual" | "server";
}

/**
 * Сравнение навыка пользователя с другими.
 */
export interface SkillComparison {
  id: string;
  userId: string;
  skillId: SkillProfileId;
  userScore: number;
  percentile: number;
  rank: SkillRank;
  
  // PvP задел (будущее)
  league?: "bronze" | "silver" | "gold" | "diamond";
  division?: number;
  rating?: number;  // ELO для будущего
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Рекомендация по тренировке навыка.
 */
export interface SkillRecommendation {
  id: string;
  skillId: SkillProfileId;
  title: string;
  description: string;
  trainingModules: TrainingModuleId[];
  frequencyPerWeek: number;
  expectedBenefit: string;
  difficulty: "easy" | "medium" | "hard";
  
  // PvP задел
  pvpRelevance?: {
    mode: string;
    description: string;
  };
}

/**
 * Виртуальные бенчмарки для симуляции сравнения.
 */
export interface VirtualBenchmark {
  skillId: SkillProfileId;
  avg: number;
  median: number;
  top25: number;
  top10: number;
  description: string;
}

// ============================================================================
// Progress System Phase 3C — Skill Achievements
// ============================================================================

/**
 * Достижение за навык (50/80 очков).
 */
export interface SkillAchievement {
  id: string;
  skillId: SkillProfileId;
  threshold: 50 | 80;            // Порог очков навыка
  title: string;
  description: string;
  icon: string;
  category: "skill_mastery";
  order: number;
  hidden: boolean;
}

/**
 * Полученное пользователем достижение за навык.
 */
export interface UserSkillAchievement {
  id: string;
  userId: string;
  skillAchievementId: string;
  skillScore: number;            // Score навыка на момент получения
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Рекомендация для тренировки навыка.
 */
export interface SkillTrainingRecommendation {
  skillId: SkillProfileId;
  level: "weak" | "medium" | "strong";
  trainingModules: TrainingModuleId[];
  title: string;
  description: string;
  priority: number;              // 1-9 (1 = высший приоритет)
}

/**
 * Сводка навыка пользователя для UI.
 */
export interface SkillSummary {
  skillId: SkillProfileId;
  score: number;
  percentile: number;
  rank: SkillRank;
  level: "weak" | "medium" | "strong";
  improvements: number;          // Улучшений за последнюю неделю
}

/**
 * Полная сводка всех навыков пользователя.
 */
export interface SkillMapSummary {
  userId: string;
  skills: SkillSummary[];
  avgPercentile: number;
  bestSkill: SkillSummary | null;
  weakestSkill: SkillSummary | null;
  topRankCount: number;          // Количество навыков в top 25%
  lastUpdated: string;
}

// ============================================================================
// PvP Foundation (Phase 3C — подготовка, скрыто до Phase 4)
// ============================================================================

/**
 * Лига пользователя (для будущего PvP).
 */
export type LeagueType =
  | "bronze_III" | "bronze_II" | "bronze_I"
  | "silver_III" | "silver_II" | "silver_I"
  | "gold_III" | "gold_II" | "gold_I"
  | "diamond";

/**
 * Профиль пользователя с PvP полями (зарезервировано).
 */
export interface UserPvPProfile {
  id: string;                    // userId
  userId: string;
  currentLeague: LeagueType | null;
  leaguePoints: number;
  weeklyRank: number | null;
  rating: number;                // ELO рейтинг
  division: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Сезон лидерборда (для будущего PvP).
 */
export interface LeaderboardSeason {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

/**
 * Запись в лидерборде (для будущего PvP).
 */
export interface LeaderboardEntry {
  id: string;
  seasonId: string;
  userId: string;
  skillId?: SkillProfileId;      // Если null — общий рейтинг
  rank: number;
  score: number;
  rating: number;
  league: LeagueType;
  createdAt: string;
  updatedAt: string;
}
