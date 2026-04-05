import type { TrainingModeId } from "../../shared/types/domain";

// Базовые константы (оставлены для обратной совместимости)
export const NBACK_GRID_SIZE = 3;
export const NBACK_STEP_MS = 1500;
export const NBACK_STIMULUS_MS = 700;
export const NBACK_PAUSE_MS = 800;

// Тайминги по уровням — чем сложнее уровень, тем больше времени на запоминание
export const LEVEL_TIMINGS = {
  1: { stepMs: 2000, stimulusMs: 1000, pauseMs: 1000 },  // 1-back: больше времени
  2: { stepMs: 1800, stimulusMs: 800, pauseMs: 1000 },   // 2-back: средний
  3: { stepMs: 2000, stimulusMs: 800, pauseMs: 1200 }    // 3-back: больше времени на запоминание
};

// Адаптивные тайминги: меняются в зависимости от точности игрока
// (относительно базовых таймингов уровня)
export const ADAPTIVE_TIMINGS = {
  // Замедление (точность < 60%) — +25% ко времени
  slow: { stepMultiplier: 1.25, stimulusMultiplier: 1.25, pauseMultiplier: 1.25 },
  // Нормальный тайминг (60-85%) — без изменений
  normal: { stepMultiplier: 1.0, stimulusMultiplier: 1.0, pauseMultiplier: 1.0 },
  // Быстрый тайминг (> 85%) — -15% ко времени
  fast: { stepMultiplier: 0.85, stimulusMultiplier: 0.85, pauseMultiplier: 0.85 }
};

export type NBackLevel = 1 | 2 | 3;
export type NBackGridSize = 3 | 4;
export type NBackDurationSec = 60 | 90 | 120;

// Тип задачи для пошагового режима
export interface NBackStepTask {
  stimulusCell: number;      // Клетка которую показываем
  comparisonCell: number;    // Клетка N шагов назад для сравнения
  isMatch: boolean;          // true = совпадает
  stepIndex: number;         // Номер задачи
}

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
  // 3-back доступен только на 3x3 — слишком сложно иначе
  const gridSize = level === 3 ? 3 : (input?.gridSize === 4 ? 4 : 3);
  const durationSec = input?.durationSec === 120 ? 120 : input?.durationSec === 90 ? 90 : 60;
  const tutorialMode = input?.tutorialMode === true;
  return { level, gridSize, durationSec, tutorialMode };
}

/** Возвращает допустимые размеры сетки для уровня */
export function getValidGridSizesForLevel(level: NBackLevel): NBackGridSize[] {
  if (level === 3) return [3]; // 3-back только на 3x3
  return [3, 4];
}

/** Выбирает адаптивный тайминг на основе уровня и точности */
export function getAdaptiveTiming(level: NBackLevel, accuracy: number): { stepMs: number; stimulusMs: number; pauseMs: number } {
  const base = LEVEL_TIMINGS[level];
  let adaptive: { stepMultiplier: number; stimulusMultiplier: number; pauseMultiplier: number };
  
  if (accuracy >= 0.85) {
    adaptive = ADAPTIVE_TIMINGS.fast;
  } else if (accuracy >= 0.60) {
    adaptive = ADAPTIVE_TIMINGS.normal;
  } else {
    adaptive = ADAPTIVE_TIMINGS.slow;
  }

  return {
    stepMs: Math.round(base.stepMs * adaptive.stepMultiplier),
    stimulusMs: Math.round(base.stimulusMs * adaptive.stimulusMultiplier),
    pauseMs: Math.round(base.pauseMs * adaptive.pauseMultiplier)
  };
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

/** Возвращает базовые тайминги для уровня */
export function getLevelTimings(level: NBackLevel): { stepMs: number; stimulusMs: number; pauseMs: number } {
  return LEVEL_TIMINGS[level];
}

export function calculateNBackSteps(durationSec: NBackDurationSec, level: NBackLevel = 1): number {
  // 3 задачи на уровень — быстро и динамично
  // 3 задачи × 3 игры = 9 задач за ~15 секунд на уровень
  return 3;
}

/**
 * Генерирует пошаговые задачи для пошагового режима.
 * Каждая задача: показать клетку → спросить "совпадает ли с N шагов назад?" → получить ответ.
 */
export function generateNBackStepTasks(
  totalTasks: number,
  level: NBackLevel,
  gridSize: NBackGridSize = 3,
  random: () => number = Math.random
): NBackStepTask[] {
  const gridCells = gridSize * gridSize;
  const tasks: NBackStepTask[] = [];
  const history: number[] = []; // История показанных клеток
  
  // Вероятность совпадения — 25% (меньше чем 30%, чтобы было реалистичнее)
  const matchProbability = 0.25;

  for (let i = 0; i < totalTasks; i++) {
    // Генерируем клетку для показа
    let stimulusCell: number;
    let comparisonCell: number;
    let isMatch: boolean;

    if (i < level) {
      // Первые `level` задач — просто показываем клетки для запоминания, без вопроса
      stimulusCell = Math.floor(random() * gridCells);
      history.push(stimulusCell);
      tasks.push({
        stimulusCell,
        comparisonCell: -1, // нет сравнения
        isMatch: false,
        stepIndex: i
      });
      continue;
    }

    // Определяем будет ли совпадение
    comparisonCell = history[i - level];
    const shouldBeMatch = random() < matchProbability;

    if (shouldBeMatch) {
      // Совпадение — показываем ту же клетку
      stimulusCell = comparisonCell;
      isMatch = true;
    } else {
      // Не совпадение — показываем другую клетку
      stimulusCell = Math.floor(random() * gridCells);
      while (stimulusCell === comparisonCell) {
        stimulusCell = Math.floor(random() * gridCells);
      }
      isMatch = false;
    }

    history.push(stimulusCell);
    tasks.push({
      stimulusCell,
      comparisonCell,
      isMatch,
      stepIndex: i
    });
  }

  return tasks;
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
