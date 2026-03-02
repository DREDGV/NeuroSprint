import type { PatternLevel, PatternModeId, PatternSetup } from '../../shared/types/pattern';

export const PATTERN_MODES: Array<{
  id: PatternModeId;
  title: string;
  description: string;
}> = [
  {
    id: 'pattern_classic',
    title: 'Классический',
    description: '15 вопросов без таймера. Максимальная точность.'
  },
  {
    id: 'pattern_timed',
    title: 'На время',
    description: '60 секунд. Максимум правильных ответов.'
  },
  {
    id: 'pattern_progressive',
    title: 'Прогрессивный',
    description: 'Адаптивная сложность. Игра до 3 ошибок.'
  }
];

export const PATTERN_LEVELS: Array<{
  id: PatternLevel;
  title: string;
  description: string;
}> = [
  {
    id: 'kids',
    title: 'Kids',
    description: 'Простые паттерны ABAB и AABB. 2 варианта ответа.'
  },
  {
    id: 'standard',
    title: 'Standard',
    description: 'Все типы паттернов. 3 варианта ответа.'
  },
  {
    id: 'pro',
    title: 'Pro',
    description: 'Комбинированные паттерны. 4 варианта ответа.'
  }
];

export const DEFAULT_PATTERN_SETUP: PatternSetup = {
  modeId: 'pattern_classic',
  level: 'standard',
  durationSec: 60,
  questionCount: 15,
  elementTypes: ['color', 'shape']
};

export function normalizePatternSetup(setup: Partial<PatternSetup>): PatternSetup {
  return {
    modeId: setup.modeId ?? 'pattern_classic',
    level: setup.level ?? 'standard',
    durationSec: setup.durationSec ?? 60,
    questionCount: setup.questionCount ?? 15,
    elementTypes: setup.elementTypes ?? ['color', 'shape']
  };
}

export function getPatternModeTitle(modeId: PatternModeId): string {
  return PATTERN_MODES.find(m => m.id === modeId)?.title ?? 'Классический';
}

export function getPatternLevelTitle(level: PatternLevel): string {
  return PATTERN_LEVELS.find(l => l.id === level)?.title ?? 'Standard';
}
