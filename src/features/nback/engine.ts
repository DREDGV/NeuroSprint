import type { TrainingModeId } from "../../shared/types/domain";

export const NBACK_GRID_SIZE = 3;
export const NBACK_STEP_MS = 1500;
export const NBACK_STIMULUS_MS = 650;
export const NBACK_PAUSE_MS = 850;

export type NBackLevel = 1 | 2 | 3;
export type NBackGridSize = 3 | 4;
export type NBackDurationSec = 60 | 90 | 120;

export interface NBackSetup {
  level: NBackLevel;
  gridSize: NBackGridSize;
  durationSec: NBackDurationSec;
  tutorialMode?: boolean;
}

export interface NBackStepEvaluation {
  hit: number;
  miss: number;
  falseAlarm: number;
  correctReject: number;
}

export interface NBackSessionMetrics extends NBackStepEvaluation {
  totalSteps: number;
  correctCount: number;
  errors: number;
  effectiveCorrect: number;
  accuracy: number;
  speed: number;
  score: number;
  combo: number;
  maxCombo: number;
}

export interface NBackEvaluationInput {
  sequence: number[];
  level: NBackLevel;
  responses: Array<boolean | undefined>;
  durationMs: number;
}

const GRID_CELLS = NBACK_GRID_SIZE * NBACK_GRID_SIZE;

function randomCell(random: () => number): number {
  return Math.floor(random() * GRID_CELLS);
}

export function normalizeNBackSetup(input: Partial<NBackSetup> | null | undefined): NBackSetup {
  const level = input?.level === 3 ? 3 : input?.level === 2 ? 2 : 1;
  const gridSize = input?.gridSize === 4 ? 4 : 3;
  const durationSec = input?.durationSec === 120 ? 120 : input?.durationSec === 90 ? 90 : 60;
  const tutorialMode = input?.tutorialMode === true;
  return { level, gridSize, durationSec, tutorialMode };
}

export function modeIdFromNBackLevel(level: NBackLevel, gridSize: NBackGridSize = 3): TrainingModeId {
  if (level === 3) return "nback_3";
  if (level === 2 && gridSize === 4) return "nback_2_4x4";
  if (level === 2) return "nback_2";
  if (gridSize === 4) return "nback_1_4x4";
  return "nback_1";
}

export function levelFromModeId(modeId: string | null): { level: NBackLevel; gridSize: NBackGridSize } | null {
  if (modeId === "nback_1") return { level: 1, gridSize: 3 };
  if (modeId === "nback_1_4x4") return { level: 1, gridSize: 4 };
  if (modeId === "nback_2") return { level: 2, gridSize: 3 };
  if (modeId === "nback_2_4x4") return { level: 2, gridSize: 4 };
  if (modeId === "nback_3") return { level: 3, gridSize: 3 };
  return null;
}

export function calculateNBackSteps(durationSec: NBackDurationSec): number {
  return Math.floor((durationSec * 1000) / NBACK_STEP_MS);
}

export function generateNBackSequence(
  totalSteps: number,
  level: NBackLevel,
  gridSize: NBackGridSize = 3,
  random: () => number = Math.random
): number[] {
  const steps = Math.max(level + 1, Math.round(totalSteps));
  const sequence: number[] = [];
  const targetProbability = 0.3;
  const gridCells = gridSize * gridSize;

  for (let index = 0; index < steps; index += 1) {
    if (index < level) {
      sequence.push(Math.floor(random() * gridCells));
      continue;
    }

    const shouldBeTarget = random() < targetProbability;
    const backValue = sequence[index - level] ?? 0;

    if (shouldBeTarget) {
      sequence.push(backValue);
      continue;
    }

    let next = Math.floor(random() * gridCells);
    while (next === backValue) {
      next = Math.floor(random() * gridCells);
    }
    sequence.push(next);
  }

  return sequence;
}

// Цвета для клеток (pastel colors)
export const CELL_COLORS = [
  "#FFB3BA", // розовый
  "#BAFFC9", // зелёный
  "#BAE1FF", // голубой
  "#FFFFBA", // жёлтый
  "#FFDFBA", // оранжевый
  "#E2F0CB", // лайм
  "#D4A5A5", // пыльная роза
  "#A8D8EA", // небесный
  "#AA96DA", // лаванда
  "#FCBAD3", // светло-розовый
  "#FFDAC1", // персиковый
  "#B5EAD7", // мятный
  "#C7CEEA", // серо-голубой
  "#F8B195", // коралловый
  "#6C5B7B", // фиолетовый
  "#355C7D"  // тёмно-синий
];

export function getCellColor(index: number, totalCells: number): string {
  return CELL_COLORS[index % CELL_COLORS.length];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export function evaluateNBackSession(input: NBackEvaluationInput & { gridSize?: NBackGridSize }): NBackSessionMetrics {
  const totalSteps = Math.max(0, Math.min(input.sequence.length, input.responses.length));
  const result: NBackStepEvaluation = {
    hit: 0,
    miss: 0,
    falseAlarm: 0,
    correctReject: 0
  };

  let combo = 0;
  let maxCombo = 0;

  for (let index = 0; index < totalSteps; index += 1) {
    const isTarget =
      index >= input.level && input.sequence[index] === input.sequence[index - input.level];
    const answerMatch = input.responses[index] === true;

    if (isTarget && answerMatch) {
      result.hit += 1;
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
      continue;
    }

    if (isTarget && !answerMatch) {
      result.miss += 1;
      combo = 0;
      continue;
    }

    if (!isTarget && answerMatch) {
      result.falseAlarm += 1;
      combo = 0;
      continue;
    }

    result.correctReject += 1;
    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
  }

  const correctCount = result.hit + result.correctReject;
  const errors = result.miss + result.falseAlarm;
  const effectiveCorrect = correctCount - errors * 0.5;
  const durationMs = Math.max(1, Math.round(input.durationMs));
  const accuracy = clamp01(correctCount / Math.max(1, totalSteps));
  const speed = correctCount / (durationMs / 60_000);
  
  // Бонус за combo влияет на score
  const comboBonus = 1 + (maxCombo * 0.05);
  const score = speed * (0.7 + 0.3 * accuracy) * comboBonus;

  return {
    ...result,
    totalSteps,
    correctCount,
    errors,
    effectiveCorrect,
    accuracy,
    speed,
    score,
    combo,
    maxCombo
  };
}
