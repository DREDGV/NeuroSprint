import type { TrainingModeId } from "../../shared/types/domain";

export type DecisionRushLevel = "kids" | "standard" | "pro";
export type DecisionRushDurationSec = 45 | 60 | 90;
export type DecisionRushPhase = "warmup" | "core" | "boss";
export type DecisionRushAnswer = "yes" | "no";

export type DecisionRushColor = "red" | "green" | "yellow" | "blue";
export type DecisionRushShape = "circle" | "square" | "triangle";

export interface DecisionRushSetup {
  level: DecisionRushLevel;
  durationSec: DecisionRushDurationSec;
}

export interface DecisionRushPrompt {
  title: string;
  description: string;
}

export interface DecisionRushStimulus {
  color: DecisionRushColor;
  shape: DecisionRushShape;
  number: number;
  stroopWord?: DecisionRushColor;
  stroopInk?: DecisionRushColor;
}

export interface DecisionRushTrial {
  phase: DecisionRushPhase;
  prompt: DecisionRushPrompt;
  stimulus: DecisionRushStimulus;
  correctAnswer: DecisionRushAnswer;
}

export interface DecisionRushTrialResult {
  phase: DecisionRushPhase;
  correct: boolean;
  answer: DecisionRushAnswer | "none";
  reactionMs: number;
  intervalMs: number;
}

export interface DecisionRushSessionMetrics {
  trialsTotal: number;
  correctCount: number;
  errors: number;
  accuracy: number;
  reactionAvgMs: number;
  reactionP90Ms: number;
  bestCombo: number;
  points: number;
  speed: number;
  score: number;
}

interface DecisionRushRule {
  title: string;
  description: string;
  evaluate(stimulus: DecisionRushStimulus): boolean;
}

const COLORS: DecisionRushColor[] = ["red", "green", "yellow", "blue"];
const SHAPES: DecisionRushShape[] = ["circle", "square", "triangle"];

const COLOR_LABELS: Record<DecisionRushColor, string> = {
  red: "красный",
  green: "зеленый",
  yellow: "желтый",
  blue: "синий"
};

const SHAPE_LABELS: Record<DecisionRushShape, string> = {
  circle: "круг",
  square: "квадрат",
  triangle: "треугольник"
};

const INITIAL_INTERVAL_MS: Record<DecisionRushLevel, number> = {
  kids: 1200,
  standard: 1100,
  pro: 1000
};

export const DECISION_RUSH_INTERVAL_MIN_MS = 450;
export const DECISION_RUSH_INTERVAL_MAX_MS = 1600;

export function modeIdFromDecisionLevel(level: DecisionRushLevel): TrainingModeId {
  if (level === "kids") {
    return "decision_kids";
  }
  if (level === "pro") {
    return "decision_pro";
  }
  return "decision_standard";
}

export function levelFromDecisionModeId(modeId: string | null): DecisionRushLevel | null {
  if (modeId === "decision_kids") {
    return "kids";
  }
  if (modeId === "decision_standard") {
    return "standard";
  }
  if (modeId === "decision_pro") {
    return "pro";
  }
  return null;
}

export function normalizeDecisionRushSetup(
  value: Partial<DecisionRushSetup> | null | undefined
): DecisionRushSetup {
  const level: DecisionRushLevel =
    value?.level === "kids" || value?.level === "pro" ? value.level : "standard";
  const durationSec: DecisionRushDurationSec =
    value?.durationSec === 45 || value?.durationSec === 90 ? value.durationSec : 60;
  return { level, durationSec };
}

export function buildDecisionPhaseDurations(durationSec: DecisionRushDurationSec): {
  warmupSec: number;
  coreSec: number;
  bossSec: number;
} {
  const warmupSec = Math.max(6, Math.round(durationSec / 6));
  const bossSec = Math.max(6, Math.round(durationSec / 6));
  const coreSec = Math.max(10, durationSec - warmupSec - bossSec);
  return { warmupSec, coreSec, bossSec };
}

export function resolveDecisionPhase(
  elapsedMs: number,
  durationSec: DecisionRushDurationSec
): DecisionRushPhase {
  const elapsedSec = Math.max(0, elapsedMs / 1000);
  const { warmupSec, coreSec } = buildDecisionPhaseDurations(durationSec);
  if (elapsedSec < warmupSec) {
    return "warmup";
  }
  if (elapsedSec < warmupSec + coreSec) {
    return "core";
  }
  return "boss";
}

function randomFrom<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

function randomInt(min: number, max: number, random: () => number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function buildStimulus(random: () => number): DecisionRushStimulus {
  return {
    color: randomFrom(COLORS, random),
    shape: randomFrom(SHAPES, random),
    number: randomInt(1, 9, random)
  };
}

function buildStroopStimulus(level: DecisionRushLevel, random: () => number): DecisionRushStimulus {
  const word = randomFrom(COLORS, random);
  const conflictProbability = level === "pro" ? 0.8 : level === "standard" ? 0.65 : 0.45;
  let ink = randomFrom(COLORS, random);
  const shouldConflict = random() < conflictProbability;

  if (shouldConflict) {
    while (ink === word) {
      ink = randomFrom(COLORS, random);
    }
  } else {
    ink = word;
  }

  return {
    color: ink,
    shape: randomFrom(SHAPES, random),
    number: randomInt(1, 9, random),
    stroopWord: word,
    stroopInk: ink
  };
}

function buildCoreRules(level: DecisionRushLevel): DecisionRushRule[] {
  const rules: DecisionRushRule[] = [
    {
      title: "Цвет",
      description: "Жми ДА, если сейчас красный",
      evaluate: (stimulus) => stimulus.color === "red"
    },
    {
      title: "Форма",
      description: "Жми ДА, если сейчас круг",
      evaluate: (stimulus) => stimulus.shape === "circle"
    }
  ];

  if (level !== "kids") {
    rules.push(
      {
        title: "Число",
        description: "Жми ДА, если число четное",
        evaluate: (stimulus) => stimulus.number % 2 === 0
      },
      {
        title: "Число",
        description: "Жми ДА, если число больше 7",
        evaluate: (stimulus) => stimulus.number > 7
      }
    );
  }

  if (level === "pro") {
    rules.push(
      {
        title: "Отрицание",
        description: "Жми ДА, если НЕ квадрат",
        evaluate: (stimulus) => stimulus.shape !== "square"
      },
      {
        title: "Отрицание",
        description: "Жми ДА, если НЕ синий",
        evaluate: (stimulus) => stimulus.color !== "blue"
      }
    );
  }

  return rules;
}

function buildWarmupRules(level: DecisionRushLevel): DecisionRushRule[] {
  const rules: DecisionRushRule[] = [
    {
      title: "Разминка",
      description: "Жми ДА, если сейчас зеленый",
      evaluate: (stimulus) => stimulus.color === "green"
    },
    {
      title: "Разминка",
      description: "Жми ДА, если сейчас круг",
      evaluate: (stimulus) => stimulus.shape === "circle"
    }
  ];

  if (level !== "kids") {
    rules.push({
      title: "Разминка",
      description: "Жми ДА, если число больше 5",
      evaluate: (stimulus) => stimulus.number > 5
    });
  }

  return rules;
}

function buildBossRule(): DecisionRushRule {
  return {
    title: "Boss: Струп",
    description: "Жми ДА, если цвет = слово",
    evaluate: (stimulus) => stimulus.stroopInk === stimulus.stroopWord
  };
}

export function createDecisionRushTrial(
  level: DecisionRushLevel,
  phase: DecisionRushPhase,
  random: () => number = Math.random
): DecisionRushTrial {
  if (phase === "boss") {
    const rule = buildBossRule();
    const stimulus = buildStroopStimulus(level, random);
    return {
      phase,
      prompt: { title: rule.title, description: rule.description },
      stimulus,
      correctAnswer: rule.evaluate(stimulus) ? "yes" : "no"
    };
  }

  const rules = phase === "warmup" ? buildWarmupRules(level) : buildCoreRules(level);
  const rule = randomFrom(rules, random);
  const stimulus = buildStimulus(random);
  return {
    phase,
    prompt: { title: rule.title, description: rule.description },
    stimulus,
    correctAnswer: rule.evaluate(stimulus) ? "yes" : "no"
  };
}

export function initialDecisionIntervalMs(level: DecisionRushLevel): number {
  return INITIAL_INTERVAL_MS[level];
}

function percentile(values: number[], q: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) {
    return sorted[0];
  }
  const index = (sorted.length - 1) * Math.max(0, Math.min(1, q));
  const low = Math.floor(index);
  const high = Math.ceil(index);
  const lowValue = sorted[low] ?? sorted[0];
  const highValue = sorted[high] ?? sorted[sorted.length - 1];
  if (low === high) {
    return lowValue;
  }
  const ratio = index - low;
  return lowValue + (highValue - lowValue) * ratio;
}

export function adaptDecisionIntervalMs(
  currentIntervalMs: number,
  recentWindow: DecisionRushTrialResult[],
  random: () => number = Math.random
): number {
  if (recentWindow.length === 0) {
    return currentIntervalMs;
  }

  const accuracy =
    recentWindow.reduce((sum, entry) => sum + (entry.correct ? 1 : 0), 0) / recentWindow.length;
  const correctReaction = recentWindow
    .filter((entry) => entry.correct)
    .map((entry) => entry.reactionMs);
  const p90 = percentile(correctReaction, 0.9);
  const avg = correctReaction.length
    ? correctReaction.reduce((sum, value) => sum + value, 0) / correctReaction.length
    : 0;
  const stable = avg > 0 ? p90 / avg <= 1.35 : false;

  let next = currentIntervalMs;
  if (accuracy > 0.92 && stable) {
    next -= 60 + Math.floor(random() * 41);
  } else if (accuracy < 0.8) {
    next += 80 + Math.floor(random() * 61);
  }

  return Math.max(DECISION_RUSH_INTERVAL_MIN_MS, Math.min(DECISION_RUSH_INTERVAL_MAX_MS, next));
}

export function evaluateDecisionRushSession(
  results: DecisionRushTrialResult[],
  durationMs: number
): DecisionRushSessionMetrics {
  const scored = results.filter((entry) => entry.phase !== "warmup");
  const trialsTotal = scored.length;
  const correctCount = scored.reduce((sum, entry) => sum + (entry.correct ? 1 : 0), 0);
  const errors = Math.max(0, trialsTotal - correctCount);
  const accuracy = trialsTotal > 0 ? correctCount / trialsTotal : 0;

  let combo = 0;
  let bestCombo = 0;
  let points = 0;
  scored.forEach((entry) => {
    if (entry.correct) {
      combo += 1;
      bestCombo = Math.max(bestCombo, combo);
      const mult = 1 + Math.min(combo, 15) * 0.05;
      points += Math.round(10 * mult);
    } else {
      combo = 0;
    }
  });

  const correctReaction = scored.filter((entry) => entry.correct).map((entry) => entry.reactionMs);
  const reactionAvgMs =
    correctReaction.length > 0
      ? correctReaction.reduce((sum, value) => sum + value, 0) / correctReaction.length
      : 0;
  const reactionP90Ms = percentile(correctReaction, 0.9);
  const effectiveMs = Math.max(1, reactionP90Ms + errors * 200);
  const score = Math.round((100_000 / effectiveMs) * (0.7 + 0.3 * accuracy));
  const speed = durationMs > 0 ? correctCount / (durationMs / 60_000) : 0;

  return {
    trialsTotal,
    correctCount,
    errors,
    accuracy,
    reactionAvgMs,
    reactionP90Ms,
    bestCombo,
    points,
    speed,
    score
  };
}

export function colorLabel(value: DecisionRushColor): string {
  return COLOR_LABELS[value];
}

export function shapeLabel(value: DecisionRushShape): string {
  return SHAPE_LABELS[value];
}
