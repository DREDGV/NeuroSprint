import {
  PatternElement,
  PatternType,
  PatternLevel,
  PatternQuestion,
  PATTERN_COLORS,
  PATTERN_SHAPES,
  PATTERN_SIZES,
  PatternSize,
  PatternColor,
  PatternShape,
  PatternContentType
} from '../../../shared/types/pattern';

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

// ==================== ГЕНЕРАТОРЫ ВИЗУАЛЬНЫХ ПАТТЕРНОВ ====================

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
  const options: PatternElement[] = [];
  while (options.length < (level === 'kids' ? 1 : 2)) {
    const wrong = randomElement();
    if (!options.some(opt => elementsEqual(opt, wrong))) {
      options.push(wrong);
    }
  }
  
  // Добавляем правильный ответ и перемешиваем
  options.push(correctAnswer);
  const shuffledOptions = shuffle(options);
  const correctIndex = shuffledOptions.findIndex(opt => elementsEqual(opt, correctAnswer));
  
  return {
    id: `abab-${Date.now()}-${Math.random()}`,
    patternType: 'ABAB',
    sequence,
    options: shuffledOptions,
    correctIndex,
    level,
    contentType: 'visual',
    hint: 'Чередование: A, B, A, B...',
    explanation: 'Паттерн чередуется между двумя элементами. После B следует A.'
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
  
  const options: PatternElement[] = [];
  while (options.length < (level === 'kids' ? 1 : 2)) {
    const wrong = randomElement();
    if (!options.some(opt => elementsEqual(opt, wrong))) {
      options.push(wrong);
    }
  }
  
  // Добавляем правильный ответ и перемешиваем
  options.push(correctAnswer);
  const shuffledOptions = shuffle(options);
  const correctIndex = shuffledOptions.findIndex(opt => elementsEqual(opt, correctAnswer));
  
  return {
    id: `aabb-${Date.now()}-${Math.random()}`,
    patternType: 'AABB',
    sequence,
    options: shuffledOptions,
    correctIndex,
    level,
    contentType: 'visual',
    hint: 'Пары: A, A, B, B...',
    explanation: 'Каждый элемент повторяется дважды. После пары B начинается новая пара A.'
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
      size: sizes[Math.min(i, sizes.length - 1)] as PatternSize
    });
  }
  
  // Следующий элемент - максимальный размер (продолжение)
  const correctAnswer = { ...baseElement, size: 'large' as PatternSize };
  
  const options: PatternElement[] = [];
  while (options.length < 2) {
    const wrong = randomElement(baseElement);
    if (!options.some(opt => elementsEqual(opt, wrong))) {
      options.push(wrong);
    }
  }
  
  // Добавляем правильный ответ и перемешиваем
  options.push(correctAnswer);
  const shuffledOptions = shuffle(options);
  const correctIndex = shuffledOptions.findIndex(opt => elementsEqual(opt, correctAnswer));
  
  return {
    id: `progression-${Date.now()}-${Math.random()}`,
    patternType: 'PROGRESSION',
    sequence,
    options: shuffledOptions,
    correctIndex,
    level,
    contentType: 'visual',
    hint: 'Прогрессия: размер увеличивается',
    explanation: 'Каждый следующий элемент больше предыдущего.'
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
  
  const options: PatternElement[] = [];
  while (options.length < (level === 'pro' ? 3 : 2)) {
    const wrong = randomElement();
    if (!options.some(opt => elementsEqual(opt, wrong))) {
      options.push(wrong);
    }
  }
  
  // Добавляем правильный ответ и перемешиваем
  options.push(correctAnswer);
  const shuffledOptions = shuffle(options);
  const correctIndex = shuffledOptions.findIndex(opt => elementsEqual(opt, correctAnswer));
  
  return {
    id: `cycle-${Date.now()}-${Math.random()}`,
    patternType: 'CYCLE',
    sequence,
    options: shuffledOptions,
    correctIndex,
    level,
    contentType: 'visual',
    hint: 'Цикл из 3 элементов: A, B, C, A, B...',
    explanation: 'Паттерн повторяется каждые 3 элемента. После A, B следует C.'
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
  
  const options: PatternElement[] = [];
  while (options.length < 2) {
    const wrong = randomElement();
    if (!options.some(opt => elementsEqual(opt, wrong))) {
      options.push(wrong);
    }
  }
  
  // Добавляем правильный ответ и перемешиваем
  options.push(correctAnswer);
  const shuffledOptions = shuffle(options);
  const correctIndex = shuffledOptions.findIndex(opt => elementsEqual(opt, correctAnswer));
  
  return {
    id: `mirror-${Date.now()}-${Math.random()}`,
    patternType: 'MIRROR',
    sequence,
    options: shuffledOptions,
    correctIndex,
    level,
    contentType: 'visual',
    hint: 'Зеркало: A, B, B, A...',
    explanation: 'Паттерн зеркально отражается. После завершения зеркала начинается новый цикл.'
  };
}

// ==================== ГЕНЕРАТОРЫ МАТЕМАТИЧЕСКИХ ПАТТЕРНОВ ====================

// MATH_SEQUENCE - Простая числовая последовательность
function generateMathSequence(level: PatternLevel): PatternQuestion {
  // Генерируем простую последовательность: +2, +3, +4, +5
  const start = randomInt(1, 10);
  const step = randomInt(2, 5);
  
  const sequence: number[] = [];
  for (let i = 0; i < 4; i++) {
    sequence.push(start + i * step);
  }
  
  const correctAnswer = start + 4 * step;
  
  // Генерируем неправильные варианты (близкие числа)
  const wrongValues = [correctAnswer - step, correctAnswer + 1, correctAnswer - 1, correctAnswer + step];
  const options: number[] = [];
  
  // Сначала добавляем все варианты
  for (const wrong of shuffle(wrongValues)) {
    if (!options.includes(wrong) && wrong > 0 && options.length < 3) {
      options.push(wrong);
    }
  }
  
  while (options.length < 3) {
    const randomWrong = randomInt(1, 50);
    if (!options.includes(randomWrong)) {
      options.push(randomWrong);
    }
  }
  
  // Добавляем правильный ответ и перемешиваем
  options.push(correctAnswer);
  const shuffledOptions = shuffle(options);
  const correctIndex = shuffledOptions.indexOf(correctAnswer);
  
  return {
    id: `math-seq-${Date.now()}-${Math.random()}`,
    patternType: 'MATH_SEQUENCE',
    sequence,
    options: shuffledOptions,
    correctIndex,
    level,
    contentType: 'numeric',
    mathRule: `+${step}`,
    hint: `Арифметическая прогрессия: каждое число больше предыдущего на ${step}`,
    explanation: `Последовательность увеличивается на ${step}: ${sequence.join(', ')}, ${correctAnswer}.`
  };
}

// MATH_ARITHMETIC - Арифметическая прогрессия
function generateMathArithmetic(level: PatternLevel): PatternQuestion {
  const start = randomInt(2, 15);
  const step = level === 'kids' ? randomInt(1, 3) : randomInt(3, 7);
  
  const sequence: number[] = [];
  for (let i = 0; i < 4; i++) {
    sequence.push(start + i * step);
  }
  
  const correctAnswer = start + 4 * step;
  
  const options: number[] = [];
  while (options.length < (level === 'kids' ? 2 : 3)) {
    const offset = randomInt(-5, 5);
    const wrong = correctAnswer + offset;
    if (!options.includes(wrong) && wrong > 0) {
      options.push(wrong);
    }
  }
  
  // Добавляем правильный ответ и перемешиваем
  options.push(correctAnswer);
  const shuffledOptions = shuffle(options);
  const correctIndex = shuffledOptions.indexOf(correctAnswer);
  
  return {
    id: `math-arith-${Date.now()}-${Math.random()}`,
    patternType: 'MATH_ARITHMETIC',
    sequence,
    options: shuffledOptions,
    correctIndex,
    level,
    contentType: 'numeric',
    mathRule: `a₁=${start}, d=${step}`,
    hint: `Каждое следующее число = предыдущее + ${step}`,
    explanation: `Арифметическая прогрессия: start=${start}, шаг=${step}. Ответ: ${correctAnswer}.`
  };
}

// MATH_ALTERNATING - Чередование операций
function generateMathAlternating(level: PatternLevel): PatternQuestion {
  const start = randomInt(5, 20);
  const add = randomInt(2, 5);
  const sub = randomInt(1, 3);
  
  const sequence: number[] = [start];
  for (let i = 1; i < 5; i++) {
    const prev = sequence[i - 1];
    sequence.push(i % 2 === 1 ? prev + add : prev - sub);
  }
  
  // Убираем последний элемент - это будет ответ
  const correctAnswer = sequence.pop()!;
  
  const options: number[] = [];
  while (options.length < (level === 'kids' ? 2 : 3)) {
    const offset = randomInt(-3, 3);
    const wrong = correctAnswer + offset;
    if (!options.includes(wrong) && wrong > 0) {
      options.push(wrong);
    }
  }
  
  // Добавляем правильный ответ и перемешиваем
  options.push(correctAnswer);
  const shuffledOptions = shuffle(options);
  const correctIndex = shuffledOptions.indexOf(correctAnswer);
  
  return {
    id: `math-alt-${Date.now()}-${Math.random()}`,
    patternType: 'MATH_ALTERNATING',
    sequence,
    options: shuffledOptions,
    correctIndex,
    level,
    contentType: 'numeric',
    mathRule: `+${add}, -${sub}`,
    hint: `Чередование: +${add}, -${sub}, +${add}, -${sub}...`,
    explanation: `Операции чередуются: +${add}, затем -${sub}. Следующее: ${correctAnswer}.`
  };
}

// ==================== ГЕНЕРАТОР ВОПРОСОВ ====================

const patternGenerators: Record<PatternType, Function> = {
  ABAB: generateABAB,
  AABB: generateAABB,
  PROGRESSION: generateProgression,
  CYCLE: generateCycle,
  MIRROR: generateMirror,
  MATH_SEQUENCE: generateMathSequence,
  MATH_ARITHMETIC: generateMathArithmetic,
  MATH_ALTERNATING: generateMathAlternating
};

// Доступные типы паттернов по уровням
const patternTypesByLevel: Record<PatternLevel, PatternType[]> = {
  kids: ['ABAB', 'AABB', 'MATH_SEQUENCE'],
  standard: ['ABAB', 'AABB', 'PROGRESSION', 'CYCLE', 'MIRROR', 'MATH_SEQUENCE', 'MATH_ARITHMETIC'],
  pro: ['ABAB', 'AABB', 'PROGRESSION', 'CYCLE', 'MIRROR', 'MATH_SEQUENCE', 'MATH_ARITHMETIC', 'MATH_ALTERNATING']
};

// Веса для генерации (больше простых паттернов)
const patternWeights: Record<PatternLevel, Record<PatternType, number>> = {
  kids: { ABAB: 40, AABB: 40, PROGRESSION: 0, CYCLE: 0, MIRROR: 0, MATH_SEQUENCE: 20, MATH_ARITHMETIC: 0, MATH_ALTERNATING: 0 },
  standard: { ABAB: 25, AABB: 25, PROGRESSION: 15, CYCLE: 15, MIRROR: 10, MATH_SEQUENCE: 10, MATH_ARITHMETIC: 0, MATH_ALTERNATING: 0 },
  pro: { ABAB: 15, AABB: 15, PROGRESSION: 15, CYCLE: 15, MIRROR: 10, MATH_SEQUENCE: 15, MATH_ARITHMETIC: 10, MATH_ALTERNATING: 5 }
};

function selectPatternType(level: PatternLevel, contentType: PatternContentType): PatternType {
  const availableTypes = patternTypesByLevel[level];
  
  // Фильтруем по типу контента
  const filteredTypes = availableTypes.filter(type => {
    if (contentType === 'visual') {
      return !type.startsWith('MATH_');
    }
    if (contentType === 'numeric') {
      return type.startsWith('MATH_');
    }
    return true; // mixed
  });
  
  if (filteredTypes.length === 0) {
    return availableTypes[0];
  }
  
  // Выбираем с учётом весов
  const weights = patternWeights[level];
  const weightedTypes = filteredTypes.filter(t => weights[t] > 0);
  
  if (weightedTypes.length === 0) {
    return filteredTypes[0];
  }
  
  const totalWeight = weightedTypes.reduce((sum, type) => sum + weights[type], 0);
  let random = Math.random() * totalWeight;
  
  for (const type of weightedTypes) {
    random -= weights[type];
    if (random <= 0) {
      return type;
    }
  }
  
  return weightedTypes[0];
}

export function generatePatternQuestion(
  level: PatternLevel,
  elementTypes: ('color' | 'shape' | 'size')[],
  contentType: PatternContentType = 'visual',
  patternType?: PatternType
): PatternQuestion {
  const selectedType = patternType || selectPatternType(level, contentType);
  const generator = patternGenerators[selectedType] as Function;
  
  if (selectedType.startsWith('MATH_')) {
    return generator(level) as PatternQuestion;
  }
  
  return generator(level, elementTypes) as PatternQuestion;
}

export function generatePatternQuestions(
  count: number,
  level: PatternLevel,
  elementTypes: ('color' | 'shape' | 'size')[],
  contentType: PatternContentType = 'visual'
): PatternQuestion[] {
  const questions: PatternQuestion[] = [];
  
  for (let i = 0; i < count; i++) {
    questions.push(generatePatternQuestion(level, elementTypes, contentType));
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
