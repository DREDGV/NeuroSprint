export type PatternColor = "red" | "orange" | "yellow" | "green" | "blue" | "purple";
export type PatternShape = "circle" | "square" | "triangle" | "diamond" | "star";
export type PatternSize = "small" | "medium" | "large";

export interface PatternElement {
  color: PatternColor;
  shape: PatternShape;
  size: PatternSize;
}

export type PatternType =
  | "ABAB"
  | "AABB"
  | "PROGRESSION"
  | "CYCLE"
  | "MIRROR"
  | "MATH_SEQUENCE"
  | "MATH_ARITHMETIC"
  | "MATH_ALTERNATING"
  | "MATH_FIBONACCI"
  | "MATH_GEOMETRIC"
  | "MATH_PRIME"
  | "MATH_SQUARES";

export type PatternLevel = "kids" | "standard" | "pro";

export type PatternModeId =
  | "pattern_classic"
  | "pattern_timed"
  | "pattern_progressive"
  | "pattern_learning"
  | "pattern_multi"
  | "pattern_survival";

export type PatternContentType = "visual" | "numeric" | "mixed";

export interface PatternSetup {
  modeId: PatternModeId;
  level: PatternLevel;
  durationSec: 45 | 60 | 90;
  questionCount: number;
  elementTypes: ("color" | "shape" | "size")[];
  contentType: PatternContentType;
  showHints: boolean;
  gaps?: number;
}

export interface PatternQuestion {
  id: string;
  patternType: PatternType;
  sequence: PatternElement[] | number[];
  options: PatternElement[] | number[];
  correctIndex: number | number[];
  level: PatternLevel;
  contentType: PatternContentType;
  hint?: string;
  explanation?: string;
  mathRule?: string;
  sequenceLength: number;
  answersNeeded: number;
  gaps: number;
  userAnswers?: number[];
}

export interface PatternAnswer {
  questionId: string;
  selectedIndex: number | number[];
  isCorrect: boolean;
  reactionTimeMs: number;
  timestamp: number;
  partialCorrectCount?: number;
  answersNeeded?: number;
}

export interface PatternSessionMetrics {
  totalQuestions: number;
  correctCount: number;
  errors: number;
  accuracy: number;
  durationMs: number;
  avgReactionTimeMs: number;
  firstCorrectTimeMs: number | null;
  maxLevel: number;
  avgLevel: number;
  patternTypes: PatternType[];
  streakBest: number;
  score: number;
}

export const PATTERN_COLORS: PatternColor[] = ["red", "orange", "yellow", "green", "blue", "purple"];
export const PATTERN_SHAPES: PatternShape[] = ["circle", "square", "triangle", "diamond", "star"];
export const PATTERN_SIZES: PatternSize[] = ["small", "medium", "large"];

export const COLOR_TO_CSS: Record<PatternColor, string> = {
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#a855f7"
};

export const SIZE_TO_CSS: Record<PatternSize, number> = {
  small: 40,
  medium: 56,
  large: 72
};
