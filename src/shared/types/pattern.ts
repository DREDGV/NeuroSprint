// Типы элементов паттерна
export type PatternColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
export type PatternShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star';
export type PatternSize = 'small' | 'medium' | 'large';

// Элемент паттерна (визуальный)
export interface PatternElement {
  color: PatternColor;
  shape: PatternShape;
  size: PatternSize;
}

// Типы паттернов
export type PatternType =
  | 'ABAB'           // Чередование
  | 'AABB'           // Повторение пар
  | 'PROGRESSION'    // Прогрессия (+1 элемент)
  | 'CYCLE'          // Цикл (ABCABC)
  | 'MIRROR'         // Зеркальный (ABBA)
  | 'MATH_SEQUENCE'  // Числовая последовательность
  | 'MATH_ARITHMETIC' // Арифметическая прогрессия
  | 'MATH_ALTERNATING'; // Чередование операций

// Уровень сложности
export type PatternLevel = 'kids' | 'standard' | 'pro';

// Режим игры
export type PatternModeId =
  | 'pattern_classic'    // Контрольный (15 вопросов)
  | 'pattern_timed'      // На время (60 сек)
  | 'pattern_progressive' // Адаптивный
  | 'pattern_learning'   // Обучающий (с подсказками)
  | 'pattern_multi';     // Несколько ответов (2-3 пропуска)

// Тип контента в паттерне
export type PatternContentType = 'visual' | 'numeric' | 'mixed';

// Настройки сессии
export interface PatternSetup {
  modeId: PatternModeId;
  level: PatternLevel;
  durationSec: 45 | 60 | 90;
  questionCount: number; // Для classic
  elementTypes: ('color' | 'shape' | 'size')[];
  contentType: PatternContentType; // visual | numeric | mixed
  showHints: boolean; // Показывать подсказки типа паттерна
  gaps?: number; // Количество пропусков (для pattern_multi)
}

// Вопрос паттерна
export interface PatternQuestion {
  id: string;
  patternType: PatternType;
  sequence: PatternElement[] | number[]; // Визуальные или числовые
  options: PatternElement[] | number[];
  correctIndex: number | number[]; // Индекс или массив индексов для нескольких ответов
  level: PatternLevel;
  contentType: PatternContentType;
  hint?: string; // Подсказка для обучающего режима
  explanation?: string; // Объяснение ответа
  mathRule?: string; // Математическое правило (для числовых паттернов)
  sequenceLength: number; // Длина последовательности
  answersNeeded: number; // Сколько ответов нужно выбрать (1 или несколько)
  gaps: number; // Количество пропусков в конце последовательности
  userAnswers?: number[]; // Выбранные пользователем ответы (индексы)
}

// Результат ответа
export interface PatternAnswer {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  reactionTimeMs: number;
  timestamp: number;
}

// Метрики сессии
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

// Константы цветов
export const PATTERN_COLORS: PatternColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
export const PATTERN_SHAPES: PatternShape[] = ['circle', 'square', 'triangle', 'diamond', 'star'];
export const PATTERN_SIZES: PatternSize[] = ['small', 'medium', 'large'];

// Маппинг на CSS
export const COLOR_TO_CSS: Record<PatternColor, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7'
};

export const SIZE_TO_CSS: Record<PatternSize, number> = {
  small: 40,
  medium: 56,
  large: 72
};
