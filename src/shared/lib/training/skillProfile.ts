import type { Session, TrainingModuleId } from "../../types/domain";

export type SkillProfileId = "attention" | "memory" | "reaction" | "math" | "logic";

export type SkillTrend = "up" | "down" | "steady";

export interface SkillAxisProfile {
  id: SkillProfileId;
  label: string;
  shortLabel: string;
  description: string;
  suggestedTraining: string;
  score: number;
  level: number;
  progressPct: number;
  sessions: number;
  trend: SkillTrend;
  trendDelta: number;
  isProvisional: boolean;
}

export interface SkillProfileSummary {
  axes: SkillAxisProfile[];
  strongest: SkillAxisProfile;
  weakest: SkillAxisProfile;
  focus: SkillAxisProfile;
  totalSessions: number;
  hasData: boolean;
}

interface SkillDefinition {
  id: SkillProfileId;
  label: string;
  shortLabel: string;
  description: string;
  suggestedTraining: string;
}

const SKILL_DEFINITIONS: SkillDefinition[] = [
  {
    id: "attention",
    label: "Внимание",
    shortLabel: "Внимание",
    description: "Фокус, устойчивость и точность в потоке.",
    suggestedTraining: "Шульте, Memory Match, Pattern Recognition"
  },
  {
    id: "memory",
    label: "Память",
    shortLabel: "Память",
    description: "Удержание образов, позиций и последовательностей.",
    suggestedTraining: "Memory Match, Memory Grid, N-Back"
  },
  {
    id: "reaction",
    label: "Реакция",
    shortLabel: "Реакция",
    description: "Скорость отклика и качество быстрых решений.",
    suggestedTraining: "Reaction, Decision Rush"
  },
  {
    id: "math",
    label: "Счёт",
    shortLabel: "Счёт",
    description: "Темп вычислений и уверенность в коротких расчётах.",
    suggestedTraining: "Sprint Math"
  },
  {
    id: "logic",
    label: "Логика",
    shortLabel: "Логика",
    description: "Правила, закономерности и переключение между ними.",
    suggestedTraining: "Decision Rush, Pattern Recognition"
  }
];

const MODULE_SCORE_TARGETS: Record<TrainingModuleId, number> = {
  schulte: 180,
  sprint_math: 120,
  reaction: 220,
  n_back: 140,
  memory_grid: 170,
  spatial_memory: 170,
  decision_rush: 220,
  memory_match: 170,
  pattern_recognition: 180
};

const MODULE_SKILL_WEIGHTS: Record<TrainingModuleId, Partial<Record<SkillProfileId, number>>> = {
  schulte: { attention: 1 },
  sprint_math: { math: 1, logic: 0.2 },
  reaction: { reaction: 1, attention: 0.22 },
  n_back: { memory: 1, attention: 0.35 },
  memory_grid: { memory: 1, attention: 0.2 },
  spatial_memory: { memory: 0.8, attention: 0.45 },
  decision_rush: { logic: 0.7, reaction: 0.4, attention: 0.25 },
  memory_match: { memory: 1, attention: 0.3 },
  pattern_recognition: { logic: 1, attention: 0.28, memory: 0.15 }
};

const LEVEL_THRESHOLDS = [0, 70, 170, 300, 470, 680, 930, 1230, 1580, 1980];
const SCORE_BASELINE = 18;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function daysSince(session: Session, now: Date): number {
  const parsedTimestamp = Date.parse(session.timestamp);
  if (!Number.isNaN(parsedTimestamp)) {
    const diffMs = now.getTime() - parsedTimestamp;
    return Math.max(0, Math.floor(diffMs / 86_400_000));
  }

  const parsedLocalDate = Date.parse(`${session.localDate}T00:00:00`);
  if (Number.isNaN(parsedLocalDate)) {
    return 0;
  }
  return Math.max(0, Math.floor((now.getTime() - parsedLocalDate) / 86_400_000));
}

function recencyWeight(days: number): number {
  return clamp(Math.pow(0.965, days), 0.28, 1);
}

function normalizeScore(moduleId: TrainingModuleId, score: number): number {
  const target = MODULE_SCORE_TARGETS[moduleId] ?? 160;
  return clamp((score / target) * 100, 0, 100);
}

function sessionQuality(session: Session): number {
  const accuracyScore = clamp(session.accuracy * 100, 0, 100);
  const scoreSignal = normalizeScore(session.moduleId, session.score);
  const errorPenalty = clamp(session.errors * 3.5, 0, 18);
  return clamp(accuracyScore * 0.58 + scoreSignal * 0.42 - errorPenalty, 0, 100);
}

function resolveLevel(xp: number): { level: number; progressPct: number } {
  let level = 1;
  for (let index = 0; index < LEVEL_THRESHOLDS.length; index += 1) {
    if (xp >= LEVEL_THRESHOLDS[index]) {
      level = index + 1;
    }
  }

  const safeLevel = clamp(level, 1, LEVEL_THRESHOLDS.length);
  const currentThreshold = LEVEL_THRESHOLDS[safeLevel - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[safeLevel] ?? currentThreshold + 400;
  const span = Math.max(1, nextThreshold - currentThreshold);
  const progressPct =
    safeLevel >= LEVEL_THRESHOLDS.length
      ? 100
      : clamp(Math.round(((xp - currentThreshold) / span) * 100), 0, 100);

  return { level: safeLevel, progressPct };
}

function resolveTrendLabel(delta: number): SkillTrend {
  if (delta >= 4) {
    return "up";
  }
  if (delta <= -4) {
    return "down";
  }
  return "steady";
}

export function buildSkillProfile(sessions: Session[], now = new Date()): SkillProfileSummary {
  const axes = SKILL_DEFINITIONS.map((skill) => {
    let weightedScoreSum = 0;
    let weightedScoreWeights = 0;
    let weightedSessionCount = 0;
    let totalXp = 0;
    let recentWindowSum = 0;
    let recentWindowWeight = 0;
    let previousWindowSum = 0;
    let previousWindowWeight = 0;

    for (const session of sessions) {
      const moduleWeights = MODULE_SKILL_WEIGHTS[session.moduleId];
      const skillWeight = moduleWeights?.[skill.id] ?? 0;
      if (skillWeight <= 0) {
        continue;
      }

      const quality = sessionQuality(session);
      const sessionDays = daysSince(session, now);
      const freshness = recencyWeight(sessionDays);
      const weightedFreshness = freshness * skillWeight;

      weightedScoreSum += quality * weightedFreshness;
      weightedScoreWeights += weightedFreshness;
      weightedSessionCount += skillWeight;
      totalXp += (4 + quality / 16) * skillWeight;

      if (sessionDays <= 14) {
        recentWindowSum += quality * skillWeight;
        recentWindowWeight += skillWeight;
      } else if (sessionDays <= 28) {
        previousWindowSum += quality * skillWeight;
        previousWindowWeight += skillWeight;
      }
    }

    const weightedAverage = weightedScoreWeights > 0 ? weightedScoreSum / weightedScoreWeights : SCORE_BASELINE;
    const confidence = clamp(weightedSessionCount / 8, 0.32, 1);
    const score = Math.round(weightedAverage * confidence + SCORE_BASELINE * (1 - confidence));
    const sessionsCount = Math.round(weightedSessionCount);
    const recentAverage = recentWindowWeight > 0 ? recentWindowSum / recentWindowWeight : score;
    const previousAverage = previousWindowWeight > 0 ? previousWindowSum / previousWindowWeight : recentAverage;
    const trendDelta = Number((recentAverage - previousAverage).toFixed(1));
    const { level, progressPct } = resolveLevel(totalXp);

    return {
      ...skill,
      score: clamp(score, 0, 100),
      level,
      progressPct,
      sessions: sessionsCount,
      trend: resolveTrendLabel(trendDelta),
      trendDelta,
      isProvisional: sessionsCount === 0
    };
  });

  const sortedByScore = [...axes].sort((left, right) => right.score - left.score);
  const sortedByFocus = [...axes].sort((left, right) => {
    if (left.score !== right.score) {
      return left.score - right.score;
    }
    return left.trendDelta - right.trendDelta;
  });

  return {
    axes,
    strongest: sortedByScore[0],
    weakest: sortedByScore[sortedByScore.length - 1],
    focus: sortedByFocus[0],
    totalSessions: sessions.length,
    hasData: sessions.length > 0
  };
}
