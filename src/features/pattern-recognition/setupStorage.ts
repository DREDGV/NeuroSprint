import type { PatternSetup } from '../../../shared/types/pattern';
import { DEFAULT_PATTERN_SETUP, normalizePatternSetup } from './engine/patternConfig';

const STORAGE_KEY = 'neurosprint:pattern-recognition:setup';

export function getPatternSetup(): PatternSetup {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return normalizePatternSetup(JSON.parse(stored));
    }
  } catch {
    // Игнорируем ошибки парсинга
  }
  return { ...DEFAULT_PATTERN_SETUP };
}

export function savePatternSetup(setup: PatternSetup): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
}

export function resetPatternSetup(): PatternSetup {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_PATTERN_SETUP };
}
