import { describe, it, expect } from 'vitest';
import {
  generatePatternQuestion,
  generatePatternQuestions,
  calculatePatternScore,
  levelToNumber,
  numberToLevel
} from '../../src/features/pattern-recognition/engine/patternGenerator';
import type { PatternLevel } from '../../src/shared/types/pattern';

describe('PatternGenerator', () => {
  describe('generatePatternQuestion', () => {
    it('должен генерировать вопрос для уровня kids', () => {
      const question = generatePatternQuestion('kids', ['color', 'shape']);
      
      expect(question).toBeDefined();
      expect(question.patternType).toMatch(/^(ABAB|AABB)$/);
      expect(question.sequence.length).toBeGreaterThanOrEqual(4);
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.level).toBe('kids');
    });

    it('должен генерировать вопрос для уровня standard', () => {
      const question = generatePatternQuestion('standard', ['color', 'shape']);
      
      expect(question.patternType).toMatch(/^(ABAB|AABB|PROGRESSION|CYCLE|MIRROR)$/);
      expect(question.level).toBe('standard');
    });

    it('должен генерировать вопрос для уровня pro', () => {
      const question = generatePatternQuestion('pro', ['color', 'shape', 'size']);
      
      expect(question.patternType).toMatch(/^(ABAB|AABB|PROGRESSION|CYCLE|MIRROR|COMBINED)$/);
      expect(question.level).toBe('pro');
    });

    it('должен генерировать вопрос конкретного типа', () => {
      const question = generatePatternQuestion('standard', ['color'], 'visual', 'ABAB');
      
      expect(question.patternType).toBe('ABAB');
    });

    it('должен иметь правильный ответ в options', () => {
      const question = generatePatternQuestion('kids', ['color'], 'visual', 'ABAB');
      
      // Проверяем, что правильный ответ существует в options
      const correctOption = question.options[question.correctIndex];
      expect(correctOption).toBeDefined();
    });
  });

  describe('generatePatternQuestions', () => {
    it('должен генерировать указанное количество вопросов', () => {
      const questions = generatePatternQuestions(10, 'standard', ['color', 'shape']);
      
      expect(questions.length).toBe(10);
      questions.forEach(q => {
        expect(q).toBeDefined();
        expect(q.id).toBeDefined();
      });
    });

    it('должен генерировать разнообразные типы паттернов', () => {
      const questions = generatePatternQuestions(20, 'standard', ['color', 'shape']);
      const types = new Set(questions.map(q => q.patternType));
      
      // Для standard должно быть несколько типов
      expect(types.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('calculatePatternScore', () => {
    it('должен рассчитывать score для идеальной игры', () => {
      const metrics = {
        correctCount: 15,
        totalQuestions: 15,
        avgLevel: 2,
        streakBest: 15,
        accuracy: 1
      };
      
      const score = calculatePatternScore(metrics);
      
      expect(score).toBeGreaterThan(100);
    });

    it('должен рассчитывать score для плохой игры', () => {
      const metrics = {
        correctCount: 5,
        totalQuestions: 15,
        avgLevel: 1,
        streakBest: 2,
        accuracy: 0.33
      };
      
      const score = calculatePatternScore(metrics);
      
      expect(score).toBeLessThan(50);
    });

    it('должен увеличивать score с уровнем', () => {
      const baseMetrics = {
        correctCount: 10,
        totalQuestions: 15,
        streakBest: 5,
        accuracy: 0.67
      };
      
      const scoreLevel1 = calculatePatternScore({ ...baseMetrics, avgLevel: 1 });
      const scoreLevel3 = calculatePatternScore({ ...baseMetrics, avgLevel: 3 });
      
      expect(scoreLevel3).toBeGreaterThan(scoreLevel1);
    });

    it('должен увеличивать score с серией', () => {
      const baseMetrics = {
        correctCount: 10,
        totalQuestions: 15,
        avgLevel: 2,
        accuracy: 0.67
      };
      
      const scoreNoStreak = calculatePatternScore({ ...baseMetrics, streakBest: 0 });
      const scoreStreak = calculatePatternScore({ ...baseMetrics, streakBest: 10 });
      
      expect(scoreStreak).toBeGreaterThan(scoreNoStreak);
    });
  });

  describe('levelToNumber', () => {
    it('должен конвертировать kids в 1', () => {
      expect(levelToNumber('kids')).toBe(1);
    });

    it('должен конвертировать standard в 2', () => {
      expect(levelToNumber('standard')).toBe(2);
    });

    it('должен конвертировать pro в 3', () => {
      expect(levelToNumber('pro')).toBe(3);
    });
  });

  describe('numberToLevel', () => {
    it('должен конвертировать 1 в kids', () => {
      expect(numberToLevel(1)).toBe('kids');
    });

    it('должен конвертировать 2 в standard', () => {
      expect(numberToLevel(2)).toBe('standard');
    });

    it('должен конвертировать 3 в pro', () => {
      expect(numberToLevel(3)).toBe('pro');
    });

    it('должен конвертировать 0 в kids', () => {
      expect(numberToLevel(0)).toBe('kids');
    });
  });
});
