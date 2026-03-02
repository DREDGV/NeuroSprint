// Типы элементов паттерна
export type PatternColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
export type PatternShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star';
export type PatternSize = 'small' | 'medium' | 'large';

// Элемент паттерна
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
  | 'COMBINED';      // Комбинированный

// Уровень сложности
export type PatternLevel = 'kids' | 'standard' | 'pro';

// Режим игры
export type PatternModeId = 
  | 'pattern_classic'    // Контрольный (15 вопросов)
  | 'pattern_timed'      // На время (60 сек)
  | 'pattern_progressive'; // Адаптивный

// Настройки сессии
export interface PatternSetup {
  modeId: PatternModeId;
  level: PatternLevel;
  durationSec: 45 | 60 | 90;
  questionCount: number; // Для classic
  elementTypes: ('color' | 'shape' | 'size')[];
}

// Вопрос паттерна
export interface PatternQuestion {
  id: string;
  patternType: PatternType;
  sequence: PatternElement[];
  options: PatternElement[];
  correctIndex: number;
  level: PatternLevel;
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
