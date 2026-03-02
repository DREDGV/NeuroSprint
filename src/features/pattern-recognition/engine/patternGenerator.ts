import {
  PatternElement,
  PatternType,
  PatternLevel,
  PatternQuestion,
  PATTERN_COLORS,
  PATTERN_SHAPES,
  PATTERN_SIZES
} from '../../shared/types/pattern';

// Утилиты
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickRandom<T>(array: T[], exclude?: T): T {
  const filtered = exclude !== undefined ? array.filter(item => item !== exclude) : array;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// Генерация случайного элемента
function randomElement(exclude?: Partial<PatternElement>): PatternElement {
  return {
    color: exclude?.color ? pickRandom(PATTERN_COLORS, exclude.color) : pickRandom(PATTERN_COLORS),
    shape: exclude?.shape ? pickRandom(PATTERN_SHAPES, exclude.shape) : pickRandom(PATTERN_SHAPES),
    size: exclude?.size ? pickRandom(PATTERN_SIZES, exclude.size) : pickRandom(PATTERN_SIZES)
  };
}

// Сравнение элементов
function elementsEqual(a: PatternElement, b: PatternElement): boolean {
  return a.color === b.color && a.shape === b.shape && a.size === b.size;
}

// ==================== ГЕНЕРАТОРЫ ПАТТЕРНОВ ====================

// ABAB - Чередование
function generateABAB(level: PatternLevel, elementTypes: ('color' | 'shape' | 'size')[]): PatternQuestion {
  const elementA = randomElement();
  const elementB = randomElement(elementA);
  
  const sequence: PatternElement[] = [];
  for (let i = 0; i < 4; i++) {
    sequence.push(i % 2 === 0 ? { ...elementA } : { ...elementB });
  }
  
  const correctAnswer = { ...elementA }; // Следующий = A
  
  // Генерируем неправильные варианты
  const options: PatternElement[] = [correctAnswer];
  while (options.length < 3) {
    const wrong = randomElement();
    if (!options.some(opt => elementsEqual(opt, wrong))) {
      options.push(wrong);
    }
  }
  
  return {
    id: `abab-${Date.now()}-${Math.random()}`,
    patternType: 'ABAB',
    sequence,
    options: shuffle(options),
    correctIndex: 0, // Будет пересчитан после shuffle
    level
  };
}

// AABB - Повторение пар
function generateAABB(level: PatternLevel, elementTypes: ('color' | 'shape' | 'size')[]): PatternQuestion {
  const elementA = randomElement();
  const elementB = randomElement(elementA);
  
  const sequence: PatternElement[] = [
    { ...elementA }, { ...elementA },
    { ...elementB }, { ...elementB }
  ];
  
  const correctAnswer = { ...elementA }; // Продолжение паттерна AABBAA...
  
  const options: PatternElement[] = [correctAnswer];
  while (options.length < 3) {
    const wrong = randomElement();
    if (!options.some(opt => elementsEqual(opt, wrong))) {
      options.push(wrong);
    }
  }
  
  return {
    id: `aabb-${Date.now()}-${Math.random()}`,
    patternType: 'AABB',
    sequence,
    options: shuffle(options),
    correctIndex: 0,
    level
  };
}

// PROGRESSION - Прогрессия (+1 элемент)
function generateProgression(level: PatternLevel, elementTypes: ('color' | 'shape' | 'size')[]): PatternQuestion {
  // Используем размер для прогрессии
  const baseElement = randomElement();
  const sizes: PatternSize[] = ['small', 'medium', 'large'];
  
  // Генерируем последовательность с увеличением размера
  const sequence: PatternElement[] = [];
  for (let i = 0; i < 3; i++) {
    sequence.push({
      ...baseElement,
      size: sizes[Math.min(i, sizes.length - 1)]
    });
  }
  
  // Следующий элемент - максимальный размер (продолжение)
  const correctAnswer = { ...baseElement, size: 'large' };
  
  const options: PatternElement[] = [correctAnswer];
  while (options.length < 3) {
    const wrong = randomElement(baseElement);
    if (!options.some(opt => elementsEqual(opt, wrong))) {
      options.push(wrong);
    }
  }
  
  return {
    id: `progression-${Date.now()}-${Math.random()}`,
    patternType: 'PROGRESSION',
    sequence,
    options: shuffle(options),
    correctIndex: 0,
    level
  };
}

// CYCLE - Цикл (ABCABC)
function generateCycle(level: PatternLevel, elementTypes: ('color' | 'shape' | 'size')[]): PatternQuestion {
  const elementA = randomElement();
  const elementB = randomElement(elementA);
  const elementC = randomElement({ ...elementA, ...elementB });
  
  const sequence: PatternElement[] = [
    { ...elementA }, { ...elementB }, { ...elementC },
    { ...elementA }, { ...elementB }
  ];
  
  const correctAnswer = { ...elementC }; // Продолжение цикла ABCABC...
  
  const options: PatternElement[] = [correctAnswer];
  while (options.length < (level === 'pro' ? 4 : 3)) {
    const wrong = randomElement();
    if (!options.some(opt => elementsEqual(opt, wrong))) {
      options.push(wrong);
    }
  }
  
  return {
    id: `cycle-${Date.now()}-${Math.random()}`,
    patternType: 'CYCLE',
    sequence,
    options: shuffle(options),
    correctIndex: 0,
    level
  };
}

// MIRROR - Зеркальный (ABBA)
function generateMirror(level: PatternLevel, elementTypes: ('color' | 'shape' | 'size')[]): PatternQuestion {
  const elementA = randomElement();
  const elementB = randomElement(elementA);
  
  const sequence: PatternElement[] = [
    { ...elementA }, { ...elementB },
    { ...elementB }, { ...elementA }
  ];
  
  // Продолжение зеркального паттерна - начинаем заново с A
  const correctAnswer = { ...elementA };
  
  const options: PatternElement[] = [correctAnswer];
  while (options.length < 3) {
    const wrong = randomElement();
    if (!options.some(opt => elementsEqual(opt, wrong))) {
      options.push(wrong);
    }
  }
  
  return {
    id: `mirror-${Date.now()}-${Math.random()}`,
    patternType: 'MIRROR',
    sequence,
    options: shuffle(options),
    correctIndex: 0,
    level
  };
}

// COMBINED - Комбинированный (для Pro уровня)
function generateCombined(level: PatternLevel, elementTypes: ('color' | 'shape' | 'size')[]): PatternQuestion {
  // Комбинируем цвет и форму: цвет чередуется, форма прогрессирует
  const colors: PatternColor[] = shuffle([...PATTERN_COLORS]).slice(0, 2);
  const shapes: PatternShape[] = shuffle([...PATTERN_SHAPES]).slice(0, 3);
  
  const sequence: PatternElement[] = [];
  for (let i = 0; i < 4; i++) {
    sequence.push({
      color: colors[i % 2],
      shape: shapes[Math.min(Math.floor(i / 2), shapes.length - 1)],
      size: 'medium'
    });
  }
  
  // Следующий: цвет меняется, форма остаётся
  const correctAnswer: PatternElement = {
    color: colors[1], // меняем цвет
    shape: shapes[Math.min(1, shapes.length - 1)],
    size: 'medium'
  };
  
  const options: PatternElement[] = [correctAnswer];
  while (options.length < 4) {
    const wrong = randomElement();
    if (!options.some(opt => elementsEqual(opt, wrong))) {
      options.push(wrong);
    }
  }
  
  return {
    id: `combined-${Date.now()}-${Math.random()}`,
    patternType: 'COMBINED',
    sequence,
    options: shuffle(options),
    correctIndex: 0,
    level
  };
}

// ==================== ГЕНЕРАТОР ВОПРОСОВ ====================

const patternGenerators: Record<PatternType, typeof generateABAB> = {
  ABAB: generateABAB,
  AABB: generateAABB,
  PROGRESSION: generateProgression,
  CYCLE: generateCycle,
  MIRROR: generateMirror,
  COMBINED: generateCombined
};

// Доступные типы паттернов по уровням
const patternTypesByLevel: Record<PatternLevel, PatternType[]> = {
  kids: ['ABAB', 'AABB'],
  standard: ['ABAB', 'AABB', 'PROGRESSION', 'CYCLE', 'MIRROR'],
  pro: ['ABAB', 'AABB', 'PROGRESSION', 'CYCLE', 'MIRROR', 'COMBINED']
};

// Длина последовательности по уровням
const sequenceLengthByLevel: Record<PatternLevel, number> = {
  kids: 4,
  standard: 5,
  pro: 6
};

export function generatePatternQuestion(
  level: PatternLevel,
  elementTypes: ('color' | 'shape' | 'size')[],
  patternType?: PatternType
): PatternQuestion {
  const availableTypes = patternType 
    ? [patternType] 
    : patternTypesByLevel[level];
  
  const selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
  const generator = patternGenerators[selectedType];
  
  return generator(level, elementTypes);
}

export function generatePatternQuestions(
  count: number,
  level: PatternLevel,
  elementTypes: ('color' | 'shape' | 'size')[]
): PatternQuestion[] {
  const questions: PatternQuestion[] = [];
  
  for (let i = 0; i < count; i++) {
    questions.push(generatePatternQuestion(level, elementTypes));
  }
  
  return questions;
}

// Расчёт очков
export function calculatePatternScore(metrics: {
  correctCount: number;
  totalQuestions: number;
  avgLevel: number;
  streakBest: number;
  accuracy: number;
}): number {
  const baseScore = (metrics.correctCount / metrics.totalQuestions) * 100;
  const levelMultiplier = 1 + (metrics.avgLevel - 1) * 0.15;
  const streakBonus = 1 + Math.min(metrics.streakBest, 10) * 0.05;
  
  return Math.round(baseScore * levelMultiplier * streakBonus);
}

// Конверсия уровня в строку
export function levelToNumber(level: PatternLevel): number {
  return level === 'kids' ? 1 : level === 'standard' ? 2 : 3;
}

export function numberToLevel(num: number): PatternLevel {
  if (num <= 1) return 'kids';
  if (num <= 2) return 'standard';
  return 'pro';
}
