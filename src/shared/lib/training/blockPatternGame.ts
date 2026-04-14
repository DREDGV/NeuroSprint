export type BlockPatternDifficulty = "easy" | "medium" | "hard";
export type BlockPatternMode = "classic" | "rotation" | "mirror";
export type BlockPatternAngle = 90 | 180 | 270;

export interface BlockPatternDifficultyConfig {
  label: string;
  blocks: number;
  memorizeSec: number;
}

export interface BlockPatternRound {
  basePattern: number[];
  expectedPattern: number[];
  rotationAngle: BlockPatternAngle;
  selectionLimit: number;
}

export interface BlockPatternEvaluation {
  hits: number;
  misses: number;
  falseHits: number;
  selectedCount: number;
  precision: number;
  recall: number;
  accuracyPercent: number;
  score: number;
  comboEligible: boolean;
  isPerfect: boolean;
  cellStates: Record<number, "correct" | "wrong" | "missed">;
}

export const BLOCK_PATTERN_GRID = 4;

export const BLOCK_PATTERN_DIFFICULTIES: Record<
  BlockPatternDifficulty,
  BlockPatternDifficultyConfig
> = {
  easy: { label: "Легко", blocks: 3, memorizeSec: 5 },
  medium: { label: "Средне", blocks: 5, memorizeSec: 4 },
  hard: { label: "Сложно", blocks: 7, memorizeSec: 3 }
};

const PREVIEW_BASE_PATTERN = [0, 1, 5];
const ROTATION_ANGLE_OPTIONS: BlockPatternAngle[] = [90, 180, 270];

function sortPattern(pattern: number[]): number[] {
  return [...new Set(pattern)].sort((left, right) => left - right);
}

export function randomSet(
  size: number,
  count: number,
  random: () => number = Math.random
): number[] {
  const values = Array.from({ length: size }, (_, index) => index);

  for (let index = values.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(random() * (index + 1));
    [values[index], values[nextIndex]] = [values[nextIndex], values[index]];
  }

  return sortPattern(values.slice(0, count));
}

export function rotate90(index: number, grid: number = BLOCK_PATTERN_GRID): number {
  const row = Math.floor(index / grid);
  const col = index % grid;
  return col * grid + (grid - 1 - row);
}

export function rotateCell(
  index: number,
  angle: BlockPatternAngle,
  grid: number = BLOCK_PATTERN_GRID
): number {
  if (angle === 90) return rotate90(index, grid);
  if (angle === 180) return rotate90(rotate90(index, grid), grid);
  return rotate90(rotate90(rotate90(index, grid), grid), grid);
}

export function mirrorHorizontal(
  index: number,
  grid: number = BLOCK_PATTERN_GRID
): number {
  const row = Math.floor(index / grid);
  const col = index % grid;
  return row * grid + (grid - 1 - col);
}

export function transformPattern(
  pattern: number[],
  mode: BlockPatternMode,
  angle: BlockPatternAngle
): number[] {
  if (mode === "classic") {
    return sortPattern(pattern);
  }

  if (mode === "rotation") {
    return sortPattern(pattern.map((cell) => rotateCell(cell, angle)));
  }

  return sortPattern(pattern.map((cell) => mirrorHorizontal(cell)));
}

export function createRound(
  blocks: number,
  mode: BlockPatternMode,
  random: () => number = Math.random
): BlockPatternRound {
  const basePattern = randomSet(BLOCK_PATTERN_GRID * BLOCK_PATTERN_GRID, blocks, random);
  const rotationAngle =
    ROTATION_ANGLE_OPTIONS[
      Math.floor(random() * ROTATION_ANGLE_OPTIONS.length)
    ] ?? 90;

  return {
    basePattern,
    expectedPattern: transformPattern(basePattern, mode, rotationAngle),
    rotationAngle,
    selectionLimit: blocks
  };
}

export function getPreviewRound(mode: BlockPatternMode): BlockPatternRound {
  const rotationAngle: BlockPatternAngle = 90;

  return {
    basePattern: PREVIEW_BASE_PATTERN,
    expectedPattern: transformPattern(PREVIEW_BASE_PATTERN, mode, rotationAngle),
    rotationAngle,
    selectionLimit: PREVIEW_BASE_PATTERN.length
  };
}

export function toggleSelection(
  current: Set<number>,
  index: number,
  selectionLimit: number
): { next: Set<number>; limitReached: boolean } {
  const next = new Set(current);

  if (next.has(index)) {
    next.delete(index);
    return { next, limitReached: false };
  }

  if (next.size >= selectionLimit) {
    return { next, limitReached: true };
  }

  next.add(index);
  return { next, limitReached: false };
}

export function evaluateAttempt(
  expectedPattern: number[],
  selectedPattern: Iterable<number>
): BlockPatternEvaluation {
  const expected = sortPattern(expectedPattern);
  const selected = sortPattern(Array.from(selectedPattern));
  const expectedSet = new Set(expected);
  const selectedSet = new Set(selected);
  const hits = selected.filter((cell) => expectedSet.has(cell)).length;
  const misses = expected.filter((cell) => !selectedSet.has(cell)).length;
  const falseHits = selected.filter((cell) => !expectedSet.has(cell)).length;
  const selectedCount = selected.length;
  const precision = selectedCount === 0 ? 0 : hits / selectedCount;
  const recall = expected.length === 0 ? 0 : hits / expected.length;
  const accuracyPercent = Math.round(((precision + recall) / 2) * 100);
  const score = Math.max(
    0,
    Math.round(hits * 20 + precision * 15 + recall * 15 - falseHits * 12 - misses * 8)
  );

  const cellStates: Record<number, "correct" | "wrong" | "missed"> = {};

  expected.forEach((cell) => {
    cellStates[cell] = selectedSet.has(cell) ? "correct" : "missed";
  });

  selected.forEach((cell) => {
    if (!expectedSet.has(cell)) {
      cellStates[cell] = "wrong";
    }
  });

  return {
    hits,
    misses,
    falseHits,
    selectedCount,
    precision,
    recall,
    accuracyPercent,
    score,
    comboEligible: accuracyPercent >= 85 && falseHits === 0,
    isPerfect: hits === expected.length && misses === 0 && falseHits === 0,
    cellStates
  };
}
