import type { TrainingModeId } from "../../shared/types/domain";

export const NBACK_GRID_SIZE = 3;
export const NBACK_STEP_MS = 1500;
export const NBACK_STIMULUS_MS = 650;
export const NBACK_PAUSE_MS = 850;

export type NBackLevel = 1 | 2;
export type NBackDurationSec = 60 | 90;

export interface NBackSetup {
  level: NBackLevel;
  durationSec: NBackDurationSec;
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
  const level = input?.level === 2 ? 2 : 1;
  const durationSec = input?.durationSec === 90 ? 90 : 60;
  return { level, durationSec };
}

export function modeIdFromNBackLevel(level: NBackLevel): TrainingModeId {
  return level === 2 ? "nback_2" : "nback_1";
}

export function levelFromModeId(modeId: string | null): NBackLevel | null {
  if (modeId === "nback_1") {
    return 1;
  }
  if (modeId === "nback_2") {
    return 2;
  }
  return null;
}

export function calculateNBackSteps(durationSec: NBackDurationSec): number {
  return Math.floor((durationSec * 1000) / NBACK_STEP_MS);
}

export function generateNBackSequence(
  totalSteps: number,
  level: NBackLevel,
  random: () => number = Math.random
): number[] {
  const steps = Math.max(level + 1, Math.round(totalSteps));
  const sequence: number[] = [];
  const targetProbability = 0.3;

  for (let index = 0; index < steps; index += 1) {
    if (index < level) {
      sequence.push(randomCell(random));
      continue;
    }

    const shouldBeTarget = random() < targetProbability;
    const backValue = sequence[index - level] ?? 0;

    if (shouldBeTarget) {
      sequence.push(backValue);
      continue;
    }

    let next = randomCell(random);
    while (next === backValue) {
      next = randomCell(random);
    }
    sequence.push(next);
  }

  return sequence;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export function evaluateNBackSession(input: NBackEvaluationInput): NBackSessionMetrics {
  const totalSteps = Math.max(0, Math.min(input.sequence.length, input.responses.length));
  const result: NBackStepEvaluation = {
    hit: 0,
    miss: 0,
    falseAlarm: 0,
    correctReject: 0
  };

  for (let index = 0; index < totalSteps; index += 1) {
    const isTarget =
      index >= input.level && input.sequence[index] === input.sequence[index - input.level];
    const answerMatch = input.responses[index] === true;

    if (isTarget && answerMatch) {
      result.hit += 1;
      continue;
    }

    if (isTarget && !answerMatch) {
      result.miss += 1;
      continue;
    }

    if (!isTarget && answerMatch) {
      result.falseAlarm += 1;
      continue;
    }

    result.correctReject += 1;
  }

  const correctCount = result.hit + result.correctReject;
  const errors = result.miss + result.falseAlarm;
  const effectiveCorrect = correctCount - errors * 0.5;
  const durationMs = Math.max(1, Math.round(input.durationMs));
  const accuracy = clamp01(correctCount / Math.max(1, totalSteps));
  const speed = correctCount / (durationMs / 60_000);
  const score = speed * (0.7 + 0.3 * accuracy);

  return {
    ...result,
    totalSteps,
    correctCount,
    errors,
    effectiveCorrect,
    accuracy,
    speed,
    score
  };
}
