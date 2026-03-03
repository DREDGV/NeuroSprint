import type { TrainingModeId } from "../../shared/types/domain";

export const MEMORY_GRID_SIZE = 3;
export const MEMORY_GRID_SHOW_MS = 1200;
export const MEMORY_GRID_PAUSE_MS = 600;
export const MEMORY_GRID_STEP_INTERVAL_MS = 1800;

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

// Параметры режимов сложности
export const DIFFICULTY_PRESETS: Record<MemoryGridDifficulty, {
  title: string;
  description: string;
  gridSizes: MemoryGridSize[];
  levelRange: [MemoryGridLevel, MemoryGridLevel];
  stepIntervalMs: number;
  recommended: string;
}> = {
  kids: {
    title: "Kids",
    description: "Мягкий режим для детей",
    gridSizes: [3],
    levelRange: [1, 5],
    stepIntervalMs: 2000, // Медленнее
    recommended: "6-10 лет"
  },
  standard: {
    title: "Standard",
    description: "Базовый режим",
    gridSizes: [3, 4],
    levelRange: [1, 7],
    stepIntervalMs: 1800, // Нормально
    recommended: "10+ лет"
  },
  pro: {
    title: "Pro",
    description: "Сложный режим",
    gridSizes: [4],
    levelRange: [3, 9],
    stepIntervalMs: 1200, // Быстрее
    recommended: "Взрослые"
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

export function getGridCells(gridSize: MemoryGridSize): number {
  return gridSize === 3 ? GRID_CELLS_3X3 : GRID_CELLS_4X4;
}

function randomCell(gridSize: MemoryGridSize, random: () => number): number {
  const cells = getGridCells(gridSize);
  return Math.floor(random() * cells);
}

export function normalizeMemoryGridSetup(input: Partial<MemoryGridSetup> | null | undefined): MemoryGridSetup {
  const mode = input?.mode === "rush" ? "rush" : "classic";
  const difficulty = input?.difficulty || "standard";
  const gridSize = input?.gridSize || (difficulty === "pro" ? 4 : 3);
  const startLevel = input?.startLevel 
    ? Math.max(
        DIFFICULTY_PRESETS[difficulty].levelRange[0],
        Math.min(input.startLevel, DIFFICULTY_PRESETS[difficulty].levelRange[1])
      ) as MemoryGridLevel
    : DIFFICULTY_PRESETS[difficulty].levelRange[0];
  const durationSec = input?.durationSec === 120 ? 120 : input?.durationSec === 90 ? 90 : 60;
  
  return { mode, difficulty, gridSize, startLevel, durationSec };
}

export function modeIdFromMemoryGridMode(mode: MemoryGridMode, difficulty: MemoryGridDifficulty = "standard", gridSize: MemoryGridSize = 3): TrainingModeId {
  const difficultySuffix = difficulty === "kids" ? "_kids" : difficulty === "pro" ? "_pro" : "";
  const sizeSuffix = gridSize === 4 ? "_4x4" : "";
  
  if (mode === "rush") return `memory_grid_rush${difficultySuffix}${sizeSuffix}` as TrainingModeId;
  return `memory_grid_classic${difficultySuffix}${sizeSuffix}` as TrainingModeId;
}

export function generateMemoryGridSequence(
  length: number,
  gridSize: MemoryGridSize,
  random: () => number = Math.random
): number[] {
  const sequence: number[] = [];
  const cells = getGridCells(gridSize);

  for (let i = 0; i < length; i++) {
    let cell = randomCell(gridSize, random);
    
    // Избегаем повторений подряд и через одну клетку
    let attempts = 0;
    while (
      (sequence.length > 0 && sequence[sequence.length - 1] === cell) ||
      (sequence.length > 1 && sequence[sequence.length - 2] === cell)
    ) {
      cell = randomCell(gridSize, random);
      attempts += 1;
      // Если не можем найти уникальную клетку (мало клеток), берём что есть
      if (attempts > 10) break;
    }
    
    sequence.push(cell);
  }

  return sequence;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export function evaluateMemoryGridSession(input: MemoryGridEvaluationInput): MemoryGridSessionMetrics {
  let correct = 0;
  let errors = 0;
  let spanMax = input.startLevel;
  let levelsCompleted = 0;
  let totalRecallTime = 0;
  
  for (let i = 0; i < input.sequences.length; i++) {
    const sequence = input.sequences[i];
    const response = input.userResponses[i] ?? [];
    const recallTime = input.recallTimesMs[i] ?? 0;
    
    // Проверяем точность воспроизведения
    const isCorrect = sequencesEqual(sequence, response);
    
    if (isCorrect) {
      correct += 1;
      levelsCompleted += 1;
      spanMax = Math.min(9, Math.max(spanMax, sequence.length)) as MemoryGridLevel;
    } else {
      errors += 1;
      // В classic режиме ошибка заканчивает игру
      if (input.mode === "classic") {
        break;
      }
    }
    
    totalRecallTime += recallTime;
  }
  
  const totalSequences = correct + errors;
  const accuracy = totalSequences > 0 ? correct / totalSequences : 0;
  const avgRecallTimeMs = correct > 0 ? totalRecallTime / correct : 0;
  
  // Score формула
  const baseScore = spanMax * 100 + levelsCompleted * 20 - errors * 15;
  const accuracyBonus = accuracy > 0.8 ? 1.2 : accuracy > 0.6 ? 1.1 : 1.0;
  const speedBonus = avgRecallTimeMs > 0 && avgRecallTimeMs < 3000 ? 1.1 : 1.0;
  const score = baseScore * accuracyBonus * speedBonus;
  
  return {
    spanMax,
    levelsCompleted,
    totalSequences,
    correct,
    errors,
    hit: correct,
    miss: 0,
    falseAlarm: errors,
    correctReject: 0,
    avgRecallTimeMs,
    accuracy,
    score
  };
}

function sequencesEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Цвета для клеток (те же что и в N-Back для консистентности)
export const MEMORY_GRID_COLORS = [
  "#FFB3BA", "#BAFFC9", "#BAE1FF", "#FFFFBA",
  "#FFDFBA", "#E2F0CB", "#D4A5A5", "#A8D8EA",
  "#AA96DA", "#FCBAD3", "#FFDAC1", "#B5EAD7",
  "#C7CEEA", "#F8B195", "#6C5B7B", "#355C7D"
];

export function getCellColor(index: number): string {
  return MEMORY_GRID_COLORS[index % MEMORY_GRID_COLORS.length];
}
