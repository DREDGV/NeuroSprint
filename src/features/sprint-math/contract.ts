export type SprintMathModeId = "add_sub" | "mixed";
export type SprintMathTierId = "kids" | "standard" | "pro";
export type SprintMathSessionSec = 30 | 60 | 90;
export type SprintMathOperator = "+" | "-" | "*" | "/";

export interface SprintMathSetup {
  modeId: SprintMathModeId;
  tierId: SprintMathTierId;
  sessionSec: SprintMathSessionSec;
  maxOperand: number;
  allowNegative: boolean;
  allowDivision: boolean;
  autoEnter: boolean;
}

export interface SprintMathTask {
  left: number;
  right: number;
  operator: SprintMathOperator;
  expression: string;
  answer: number;
}

export interface SprintMathMetricsInput {
  correctCount: number;
  errors: number;
  sessionSec: SprintMathSessionSec;
  solveTimesMs: number[];
  streakBest: number;
}

export interface SprintMathMetrics {
  throughput: number;
  accuracy: number;
  avgSolveMs: number;
  streakBest: number;
  score: number;
}

export interface SprintMathSessionContract {
  taskId: "sprint_math";
  moduleId: "sprint_math";
  modeId: SprintMathModeId;
  setup: SprintMathSetup;
  metrics: SprintMathMetrics;
}

export const DEFAULT_SPRINT_MATH_SETUP: SprintMathSetup = {
  modeId: "add_sub",
  tierId: "kids",
  sessionSec: 60,
  maxOperand: 20,
  allowNegative: false,
  allowDivision: false,
  autoEnter: true
};

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeTier(tierId: unknown): SprintMathTierId {
  if (tierId === "kids" || tierId === "standard" || tierId === "pro") {
    return tierId;
  }
  return DEFAULT_SPRINT_MATH_SETUP.tierId;
}

function normalizeMode(modeId: unknown): SprintMathModeId {
  if (modeId === "add_sub" || modeId === "mixed") {
    return modeId;
  }
  return DEFAULT_SPRINT_MATH_SETUP.modeId;
}

function normalizeSessionSec(value: unknown): SprintMathSessionSec {
  if (value === 30 || value === 60 || value === 90) {
    return value;
  }
  return DEFAULT_SPRINT_MATH_SETUP.sessionSec;
}

function defaultOperandByTier(tierId: SprintMathTierId): number {
  if (tierId === "kids") {
    return 20;
  }
  if (tierId === "standard") {
    return 50;
  }
  return 100;
}

export function normalizeSprintMathSetup(
  setup: Partial<SprintMathSetup> | null | undefined
): SprintMathSetup {
  if (!setup) {
    return { ...DEFAULT_SPRINT_MATH_SETUP };
  }

  const tierId = normalizeTier(setup.tierId);
  const modeId = normalizeMode(setup.modeId);
  const sessionSec = normalizeSessionSec(setup.sessionSec);
  const fallbackOperand = defaultOperandByTier(tierId);

  const maxOperand = clampNumber(setup.maxOperand, 5, 200, fallbackOperand);
  const allowNegative = typeof setup.allowNegative === "boolean" ? setup.allowNegative : false;
  const allowDivision = typeof setup.allowDivision === "boolean" ? setup.allowDivision : false;
  const autoEnter = typeof setup.autoEnter === "boolean" ? setup.autoEnter : true;

  return {
    modeId,
    tierId,
    sessionSec,
    maxOperand,
    allowNegative,
    allowDivision: tierId === "kids" ? false : allowDivision,
    autoEnter
  };
}

export function calcSprintMathMetrics(input: SprintMathMetricsInput): SprintMathMetrics {
  const correctCount = Math.max(0, input.correctCount);
  const errors = Math.max(0, input.errors);
  const attempts = correctCount + errors;
  const minutes = Math.max(1 / 60, input.sessionSec / 60);
  const throughput = correctCount / minutes;
  const accuracy = attempts === 0 ? 0 : correctCount / attempts;

  const validTimes = input.solveTimesMs
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Number(value));
  const avgSolveMs =
    validTimes.length === 0
      ? 0
      : validTimes.reduce((sum, value) => sum + value, 0) / validTimes.length;

  const streakBest = Math.max(0, Math.round(input.streakBest));
  const score = throughput * (0.7 + 0.3 * accuracy);

  return {
    throughput,
    accuracy,
    avgSolveMs,
    streakBest,
    score
  };
}

function randomInt(min: number, max: number, random: () => number): number {
  const left = Math.ceil(min);
  const right = Math.floor(max);
  return Math.floor(random() * (right - left + 1)) + left;
}

function pickOperator(
  setup: SprintMathSetup,
  random: () => number
): SprintMathOperator {
  if (setup.modeId === "add_sub") {
    return random() < 0.5 ? "+" : "-";
  }

  const mixedOps: SprintMathOperator[] = setup.allowDivision
    ? ["+", "-", "*", "/"]
    : ["+", "-", "*"];
  const index = randomInt(0, mixedOps.length - 1, random);
  return mixedOps[index];
}

function buildOperands(
  operator: SprintMathOperator,
  setup: SprintMathSetup,
  random: () => number
): { left: number; right: number; answer: number } {
  if (operator === "/") {
    const right = randomInt(2, Math.max(2, Math.floor(setup.maxOperand / 2)), random);
    const answer = randomInt(1, Math.max(1, Math.floor(setup.maxOperand / right)), random);
    const left = right * answer;
    return { left, right, answer };
  }

  const left = randomInt(1, setup.maxOperand, random);
  const right = randomInt(1, setup.maxOperand, random);

  if (operator === "+") {
    return { left, right, answer: left + right };
  }

  if (operator === "-") {
    if (setup.allowNegative || left >= right) {
      return { left, right, answer: left - right };
    }
    return { left: right, right: left, answer: right - left };
  }

  return { left, right, answer: left * right };
}

function toExpression(left: number, right: number, operator: SprintMathOperator): string {
  const op = operator === "/" ? "/" : operator;
  return `${left} ${op} ${right}`;
}

export function buildSprintMathTask(
  setupInput: Partial<SprintMathSetup> | null | undefined,
  random: () => number = Math.random
): SprintMathTask {
  const setup = normalizeSprintMathSetup(setupInput);
  const operator = pickOperator(setup, random);
  const { left, right, answer } = buildOperands(operator, setup, random);

  return {
    left,
    right,
    operator,
    expression: toExpression(left, right, operator),
    answer
  };
}
