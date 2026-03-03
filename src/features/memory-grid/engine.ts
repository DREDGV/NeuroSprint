import type { TrainingModeId } from "../../shared/types/domain";

export const MEMORY_GRID_SHOW_MS = 850;
export const MEMORY_GRID_PAUSE_MS = 350;
export const MEMORY_GRID_STEP_INTERVAL_MS = 1150;

export type MemoryGridLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type MemoryGridSize = 3 | 4;
export type MemoryGridMode = "classic" | "rush";
export type MemoryGridDifficulty = "kids" | "standard" | "pro";

export interface MemoryGridSetup {
  mode: MemoryGridMode;
  difficulty: MemoryGridDifficulty;
  gridSize: MemoryGridSize;
  startLevel: MemoryGridLevel;
  durationSec?: 60 | 90 | 120;
}

export const DIFFICULTY_PRESETS: Record<
  MemoryGridDifficulty,
  {
    title: string;
    description: string;
    gridSizes: MemoryGridSize[];
    levelRange: [MemoryGridLevel, MemoryGridLevel];
    stepIntervalMs: number;
    recommended: string;
  }
> = {
  kids: {
    title: "Kids",
    description: "Мягкий темп и короткие последовательности для старта.",
    gridSizes: [3],
    levelRange: [1, 5],
    stepIntervalMs: 1400,
    recommended: "6-10 лет"
  },
  standard: {
    title: "Standard",
    description: "Сбалансированный режим для ежедневной тренировки памяти.",
    gridSizes: [3, 4],
    levelRange: [1, 7],
    stepIntervalMs: 1150,
    recommended: "10+ лет"
  },
  pro: {
    title: "Pro",
    description: "Ускоренный темп и более длинные последовательности.",
    gridSizes: [4],
    levelRange: [3, 9],
    stepIntervalMs: 900,
    recommended: "Продвинутый уровень"
  }
};

export interface MemoryGridStepEvaluation {
  hit: number;
  miss: number;
  falseAlarm: number;
  correctReject: number;
}

export interface MemoryGridSessionMetrics extends MemoryGridStepEvaluation {
  spanMax: number;
  levelsCompleted: number;
  totalSequences: number;
  correct: number;
  errors: number;
  avgRecallTimeMs: number;
  accuracy: number;
  score: number;
}

export interface MemoryGridEvaluationInput {
  sequences: number[][];
  userResponses: number[][];
  recallTimesMs: number[];
  mode: MemoryGridMode;
  startLevel: MemoryGridLevel;
}

const GRID_CELLS_3X3 = 9;
const GRID_CELLS_4X4 = 16;

const MEMORY_GRID_COLORS = [
  "#FFB3BA",
  "#BAFFC9",
  "#BAE1FF",
  "#FFFFBA",
  "#FFDFBA",
  "#E2F0CB",
  "#D4A5A5",
  "#A8D8EA",
  "#AA96DA",
  "#FCBAD3",
  "#FFDAC1",
  "#B5EAD7",
  "#C7CEEA",
  "#F8B195",
  "#6C5B7B",
  "#355C7D"
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampLevel(level: number): MemoryGridLevel {
  return clamp(Math.round(level), 1, 9) as MemoryGridLevel;
}

function randomCell(gridSize: MemoryGridSize, random: () => number): number {
  return Math.floor(random() * getGridCells(gridSize));
}

function sequencesEqual(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

export function getGridCells(gridSize: MemoryGridSize): number {
  return gridSize === 4 ? GRID_CELLS_4X4 : GRID_CELLS_3X3;
}

export function getStepIntervalMs(difficulty: MemoryGridDifficulty): number {
  return DIFFICULTY_PRESETS[difficulty].stepIntervalMs;
}

export function normalizeMemoryGridSetup(
  input: Partial<MemoryGridSetup> | null | undefined
): MemoryGridSetup {
  const mode: MemoryGridMode = input?.mode === "rush" ? "rush" : "classic";
  const difficulty: MemoryGridDifficulty =
    input?.difficulty === "kids" || input?.difficulty === "pro"
      ? input.difficulty
      : "standard";

  const preset = DIFFICULTY_PRESETS[difficulty];
  const requestedSize: MemoryGridSize = input?.gridSize === 4 ? 4 : 3;
  const gridSize = preset.gridSizes.includes(requestedSize)
    ? requestedSize
    : preset.gridSizes[0];

  const requestedLevel = clampLevel(input?.startLevel ?? preset.levelRange[0]);
  const startLevel = clamp(
    requestedLevel,
    preset.levelRange[0],
    preset.levelRange[1]
  ) as MemoryGridLevel;

  const durationSec: 60 | 90 | 120 =
    input?.durationSec === 120 ? 120 : input?.durationSec === 90 ? 90 : 60;

  return {
    mode,
    difficulty,
    gridSize,
    startLevel,
    durationSec
  };
}

export function modeIdFromMemoryGridMode(
  mode: MemoryGridMode,
  difficulty: MemoryGridDifficulty = "standard",
  gridSize: MemoryGridSize = 3
): TrainingModeId {
  const difficultySuffix =
    difficulty === "kids" ? "_kids" : difficulty === "pro" ? "_pro" : "";
  const sizeSuffix = gridSize === 4 ? "_4x4" : "";

  if (mode === "rush") {
    return `memory_grid_rush${difficultySuffix}${sizeSuffix}` as TrainingModeId;
  }
  return `memory_grid_classic${difficultySuffix}${sizeSuffix}` as TrainingModeId;
}

export function generateMemoryGridSequence(
  length: number,
  gridSize: MemoryGridSize,
  random: () => number = Math.random
): number[] {
  const safeLength = Math.max(1, Math.round(length));
  const sequence: number[] = [];

  for (let index = 0; index < safeLength; index += 1) {
    let cell = randomCell(gridSize, random);
    let attempts = 0;

    // Avoid immediate repeats and ABAB loops while keeping generation bounded.
    while (
      attempts < 20 &&
      ((sequence.length > 0 && sequence[sequence.length - 1] === cell) ||
        (sequence.length > 2 && sequence[sequence.length - 3] === cell))
    ) {
      cell = randomCell(gridSize, random);
      attempts += 1;
    }

    sequence.push(cell);
  }

  return sequence;
}

export function evaluateMemoryGridSession(
  input: MemoryGridEvaluationInput
): MemoryGridSessionMetrics {
  const totalSequences = Math.min(input.sequences.length, input.userResponses.length);
  const safeStartSpan = clampLevel(input.startLevel);

  let correct = 0;
  let errors = 0;
  let spanMax = safeStartSpan;
  let totalRecallTime = 0;

  for (let index = 0; index < totalSequences; index += 1) {
    const sequence = input.sequences[index] ?? [];
    const response = input.userResponses[index] ?? [];
    const recallTime = Math.max(0, input.recallTimesMs[index] ?? 0);
    const isCorrect = sequencesEqual(sequence, response);

    totalRecallTime += recallTime;
    if (isCorrect) {
      correct += 1;
      spanMax = Math.min(9, Math.max(spanMax, sequence.length)) as MemoryGridLevel;
    } else {
      errors += 1;
      if (input.mode === "classic") {
        break;
      }
    }
  }

  const processed = correct + errors;
  const accuracy = processed > 0 ? correct / processed : 0;
  const avgRecallTimeMs = processed > 0 ? totalRecallTime / processed : 0;
  const levelsCompleted = correct;

  const base = spanMax * 80 + levelsCompleted * 50 - errors * 30;
  const accuracyFactor = 0.7 + 0.3 * accuracy;
  const tempoFactor =
    avgRecallTimeMs > 0 ? clamp(2600 / avgRecallTimeMs, 0.65, 1.2) : 1;
  const modeFactor = input.mode === "rush" ? 1.08 : 1;
  const score = Math.max(0, Math.round(base * accuracyFactor * tempoFactor * modeFactor));

  return {
    spanMax,
    levelsCompleted,
    totalSequences: processed,
    correct,
    errors,
    hit: correct,
    miss: errors,
    falseAlarm: 0,
    correctReject: 0,
    avgRecallTimeMs,
    accuracy,
    score
  };
}

export function getCellColor(index: number): string {
  return MEMORY_GRID_COLORS[index % MEMORY_GRID_COLORS.length] ?? MEMORY_GRID_COLORS[0];
}
