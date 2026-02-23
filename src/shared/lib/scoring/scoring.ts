export interface ClassicMetricsInput {
  durationMs: number;
  errors: number;
  numbersCount?: number;
}

export interface ClassicMetrics {
  speed: number;
  accuracy: number;
  score: number;
}

export interface TimedMetricsInput {
  correctCount: number;
  errors: number;
  timeLimitSec: number;
  errorPenalty?: number;
}

export interface TimedMetrics {
  effectiveCorrect: number;
  speed: number;
  accuracy: number;
  score: number;
}

export function clampAccuracy(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

export function calcClassicMetrics(input: ClassicMetricsInput): ClassicMetrics {
  const numbersCount = input.numbersCount ?? 25;
  const minutes = input.durationMs > 0 ? input.durationMs / 60_000 : 0;
  const speed = minutes > 0 ? numbersCount / minutes : 0;
  const accuracy = clampAccuracy((numbersCount - input.errors) / numbersCount);
  const score = speed * (0.7 + 0.3 * accuracy);

  return {
    speed,
    accuracy,
    score
  };
}

export function calcTimedMetrics(input: TimedMetricsInput): TimedMetrics {
  const errorPenalty = input.errorPenalty ?? 0.5;
  const effectiveCorrect = input.correctCount - input.errors * errorPenalty;
  const minutes = input.timeLimitSec / 60;
  const speed = minutes > 0 ? effectiveCorrect / minutes : 0;
  const totalAttempts = input.correctCount + input.errors;
  const accuracy = totalAttempts > 0 ? input.correctCount / totalAttempts : 0;
  const score = Math.max(0, speed) * (0.7 + 0.3 * accuracy);

  return {
    effectiveCorrect,
    speed,
    accuracy: clampAccuracy(accuracy),
    score
  };
}

