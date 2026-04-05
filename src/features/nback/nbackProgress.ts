/**
 * Система прогрессии N-Back тренажёра
 *
 * Правила:
 * - Максимум 3 игры на каждом уровне
 * - ≥90% точность → +1 уровень
 * - 70-89% → остаёмся (ещё 1 попытка)
 * - <70% → -1 уровень (но не ниже 1)
 * - 3 игры на уровне → автопереход
 */

import type { NBackLevel } from "./engine";

export interface NBackProgress {
  currentLevel: NBackLevel;       // Текущий рабочий уровень
  gamesAtLevel: number;           // Сколько игр сыграно на текущем уровне
  lastAccuracy: number;           // Точность последней игры
  levelHistory: LevelHistoryEntry[]; // История переходов
  totalGames: number;             // Всего игр сыграно
  bestLevel: NBackLevel;          // Лучший достигнутый уровень
}

export interface LevelHistoryEntry {
  fromLevel: NBackLevel;
  toLevel: NBackLevel;
  accuracy: number;
  reason: 'accuracy_high' | 'accuracy_low' | 'max_games' | 'manual';
  timestamp: string;
}

export type ProgressAction = 
  | { type: 'level_up'; fromLevel: NBackLevel; toLevel: NBackLevel }
  | { type: 'stay'; level: NBackLevel }
  | { type: 'level_down'; fromLevel: NBackLevel; toLevel: NBackLevel }
  | { type: 'max_games_reached'; fromLevel: NBackLevel; toLevel: NBackLevel };

export interface ProgressResult {
  action: ProgressAction;
  message: string;
  emoji: string;
}

const MAX_GAMES_AT_LEVEL = 3;
const ACCURACY_THRESHOLD_UP = 0.90;
const ACCURACY_THRESHOLD_STAY = 0.70;

const STORAGE_KEY = 'neurosprint:nback-progress';

// ─── Инициализация ─────────────────────────────────────────────────────────

export function createInitialProgress(): NBackProgress {
  return {
    currentLevel: 1,
    gamesAtLevel: 0,
    lastAccuracy: 0,
    levelHistory: [],
    totalGames: 0,
    bestLevel: 1
  };
}

// ─── Хранилище ─────────────────────────────────────────────────────────────

export function loadProgress(): NBackProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Валидация
      if (parsed.currentLevel >= 1 && parsed.currentLevel <= 3) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return createInitialProgress();
}

export function saveProgress(progress: NBackProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage errors
  }
}

export function resetProgress(): NBackProgress {
  const initial = createInitialProgress();
  saveProgress(initial);
  return initial;
}

// ─── Логика прогрессии ─────────────────────────────────────────────────────

/**
 * Определяет следующее действие на основе результата игры
 */
export function calculateNextLevel(
  progress: NBackProgress,
  accuracy: number
): ProgressResult {
  const { currentLevel, gamesAtLevel } = progress;
  const clampedAccuracy = Math.max(0, Math.min(1, accuracy));

  // Обновляем точность
  progress.lastAccuracy = clampedAccuracy;

  // Правило 1: Максимум игр на уровне → автопереход
  if (gamesAtLevel >= MAX_GAMES_AT_LEVEL) {
    if (currentLevel < 3) {
      const toLevel = (currentLevel + 1) as NBackLevel;
      return {
        action: { type: 'max_games_reached', fromLevel: currentLevel, toLevel },
        message: `Вы сыграли ${MAX_GAMES_AT_LEVEL} игры на ${currentLevel}-back. Переходим на ${toLevel}-back!`,
        emoji: '🏆'
      };
    } else {
      // Уже на максимуме
      return {
        action: { type: 'stay', level: currentLevel },
        message: 'Вы на максимальном уровне! Продолжайте тренироваться.',
        emoji: '👑'
      };
    }
  }

  // Правило 2: Высокая точность → повышение
  if (clampedAccuracy >= ACCURACY_THRESHOLD_UP) {
    if (currentLevel < 3) {
      const toLevel = (currentLevel + 1) as NBackLevel;
      return {
        action: { type: 'level_up', fromLevel: currentLevel, toLevel },
        message: `Отличный результат (${(clampedAccuracy * 100).toFixed(0)}%)! Переход на ${toLevel}-back!`,
        emoji: '🎉'
      };
    } else {
      // Максимальный уровень — показываем достижение
      if (clampedAccuracy >= 0.95) {
        return {
          action: { type: 'stay', level: currentLevel },
          message: `Мастерство! ${Math.round(clampedAccuracy * 100)}% на ${currentLevel}-back! Вы покорили все уровни. 🏆`,
          emoji: '👑'
        };
      }
      return {
        action: { type: 'stay', level: currentLevel },
        message: `Отлично (${(clampedAccuracy * 100).toFixed(0)}%)! Вы на максимуме — закрепляйте результат.`,
        emoji: '💪'
      };
    }
  }

  // Правило 3: Средняя точность → остаёмся
  if (clampedAccuracy >= ACCURACY_THRESHOLD_STAY) {
    return {
      action: { type: 'stay', level: currentLevel },
      message: `Неплохо (${(clampedAccuracy * 100).toFixed(0)}%)! Ещё одна попытка на ${currentLevel}-back.`,
      emoji: '💪'
    };
  }

  // Правило 4: Низкая точность → понижение
  if (currentLevel > 1) {
    const toLevel = (currentLevel - 1) as NBackLevel;
    return {
      action: { type: 'level_down', fromLevel: currentLevel, toLevel },
      message: `Сложновато (${(clampedAccuracy * 100).toFixed(0)}%). Вернёмся на ${toLevel}-back для закрепления.`,
      emoji: '📉'
    };
  }

  // Уже на минимуме
  return {
    action: { type: 'stay', level: 1 },
    message: `Продолжаем тренироваться на 1-back. Всё получится!`,
    emoji: '🌱'
  };
}

/**
 * Применяет результат игры и обновляет прогресс
 */
export function applyGameResult(
  progress: NBackProgress,
  accuracy: number
): { progress: NBackProgress; result: ProgressResult } {
  console.log('[Progress] Input - level:', progress.currentLevel, 'gamesAtLevel:', progress.gamesAtLevel, 'accuracy:', accuracy.toFixed(2));
  
  const result = calculateNextLevel(progress, accuracy);
  console.log('[Progress] Action:', result.action.type, result.message);

  // Обновляем прогресс
  const newProgress: NBackProgress = {
    ...progress,
    totalGames: progress.totalGames + 1,
    lastAccuracy: accuracy
  };

  // Применяем действие
  switch (result.action.type) {
    case 'level_up':
    case 'max_games_reached': {
      const { toLevel } = result.action;
      newProgress.currentLevel = toLevel;
      newProgress.gamesAtLevel = 0;
      newProgress.bestLevel = Math.max(progress.bestLevel, toLevel) as NBackLevel;
      newProgress.levelHistory = [
        ...progress.levelHistory,
        {
          fromLevel: progress.currentLevel,
          toLevel,
          accuracy,
          reason: result.action.type === 'level_up' ? 'accuracy_high' : 'max_games',
          timestamp: new Date().toISOString()
        }
      ];
      console.log('[Progress] Level UP! From', progress.currentLevel, 'to', toLevel);
      break;
    }
    case 'level_down': {
      const { toLevel } = result.action;
      newProgress.currentLevel = toLevel;
      newProgress.gamesAtLevel = 0;
      newProgress.levelHistory = [
        ...progress.levelHistory,
        {
          fromLevel: progress.currentLevel,
          toLevel,
          accuracy,
          reason: 'accuracy_low',
          timestamp: new Date().toISOString()
        }
      ];
      console.log('[Progress] Level DOWN! From', progress.currentLevel, 'to', toLevel);
      break;
    }
    case 'stay':
      newProgress.gamesAtLevel = progress.gamesAtLevel + 1;
      console.log('[Progress] Stay at level', progress.currentLevel, 'gamesAtLevel:', newProgress.gamesAtLevel);
      break;
  }

  saveProgress(newProgress);
  console.log('[Progress] Saved - level:', newProgress.currentLevel, 'gamesAtLevel:', newProgress.gamesAtLevel);
  return { progress: newProgress, result };
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

/**
 * Получает текстовое описание текущего состояния прогрессии
 */
export function getProgressDescription(progress: NBackProgress): string {
  const { currentLevel, gamesAtLevel, bestLevel, totalGames } = progress;
  const remaining = MAX_GAMES_AT_LEVEL - gamesAtLevel;
  
  if (currentLevel === bestLevel && gamesAtLevel === 0) {
    return `Новый уровень! Сыграйте до ${MAX_GAMES_AT_LEVEL} игр для перехода дальше.`;
  }
  
  if (remaining > 0) {
    return `Ещё ${remaining} ${remaining === 1 ? 'игра' : 'игры'} до перехода на ${Math.min(currentLevel + 1, 3)}-back`;
  }
  
  return `Следующая игра — переход на ${Math.min(currentLevel + 1, 3)}-back`;
}

/**
 * Процент прогресса на текущем уровне (0-100)
 */
export function getLevelProgressPercent(progress: NBackProgress): number {
  return Math.round((progress.gamesAtLevel / MAX_GAMES_AT_LEVEL) * 100);
}
