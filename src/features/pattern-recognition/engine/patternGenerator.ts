import {
  PATTERN_COLORS,
  PATTERN_SHAPES,
  PATTERN_SIZES,
  type PatternColor,
  type PatternContentType,
  type PatternElement,
  type PatternLevel,
  type PatternModeId,
  type PatternQuestion,
  type PatternShape,
  type PatternSize,
  type PatternType
} from "../../../shared/types/pattern";

type VisualFeature = "color" | "shape" | "size";
type NumericPatternType =
  | "MATH_SEQUENCE"
  | "MATH_ARITHMETIC"
  | "MATH_ALTERNATING"
  | "MATH_FIBONACCI"
  | "MATH_GEOMETRIC"
  | "MATH_PRIME"
  | "MATH_SQUARES";

export interface PatternGenerationOptions {
  gaps?: number;
  multiGap?: boolean;
  modeId?: PatternModeId;
  questionIndex?: number;
  adaptiveState?: {
    streak?: number;
    errorCount?: number;
  };
}

export interface PatternDifficultyProfile {
  level: PatternLevel;
  stage: "foundation" | "build" | "challenge";
  stageLabel: string;
  description: string;
  gaps: number;
  allowedTypes: PatternType[];
}

const ALL_ELEMENT_TYPES: VisualFeature[] = ["color", "shape", "size"];
const MULTI_GAP_SUPPORTED_TYPES = new Set<PatternType>([
  "ABAB",
  "AABB",
  "CYCLE",
  "MIRROR",
  "MATH_SEQUENCE",
  "MATH_ARITHMETIC",
  "MATH_ALTERNATING"
]);

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(array: readonly T[]): T[] {
  const result = [...array];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function pickRandom<T>(array: readonly T[], exclude?: T): T {
  const pool = exclude === undefined ? array : array.filter((item) => item !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

function createBaseElement(): PatternElement {
  return {
    color: pickRandom(PATTERN_COLORS),
    shape: pickRandom(PATTERN_SHAPES),
    size: pickRandom(PATTERN_SIZES)
  };
}

function elementsEqual(first: PatternElement, second: PatternElement): boolean {
  return first.color === second.color && first.shape === second.shape && first.size === second.size;
}

function mutateFeatureValue(element: PatternElement, feature: VisualFeature): PatternElement {
  if (feature === "color") {
    return { ...element, color: pickRandom(PATTERN_COLORS, element.color) };
  }
  if (feature === "shape") {
    return { ...element, shape: pickRandom(PATTERN_SHAPES, element.shape) };
  }
  return { ...element, size: pickRandom(PATTERN_SIZES, element.size) };
}

function createDistinctElement(
  base: PatternElement,
  elementTypes: VisualFeature[],
  excluded: PatternElement[] = []
): PatternElement {
  const activeTypes = elementTypes.length > 0 ? elementTypes : ALL_ELEMENT_TYPES;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    let candidate = { ...base };
    for (const feature of activeTypes) {
      candidate = mutateFeatureValue(candidate, feature);
    }

    if (!excluded.some((option) => elementsEqual(option, candidate))) {
      return candidate;
    }
  }

  const fallback = createBaseElement();
  return excluded.some((option) => elementsEqual(option, fallback))
    ? { ...fallback, color: pickRandom(PATTERN_COLORS, fallback.color) }
    : fallback;
}

function createDistractorElement(
  reference: PatternElement,
  elementTypes: VisualFeature[],
  level: PatternLevel,
  excluded: PatternElement[] = []
): PatternElement {
  const activeTypes = elementTypes.length > 0 ? elementTypes : ALL_ELEMENT_TYPES;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    let candidate = { ...reference };
    const featuresToChange = shuffle(activeTypes).slice(0, level === "pro" ? Math.min(2, activeTypes.length) : 1);

    for (const feature of featuresToChange) {
      candidate = mutateFeatureValue(candidate, feature);
    }

    if (!excluded.some((option) => elementsEqual(option, candidate))) {
      return candidate;
    }
  }

  return createDistinctElement(reference, activeTypes, excluded);
}

function getVisualDistractorCount(level: PatternLevel, gaps: number): number {
  if (level === "kids") {
    return Math.max(2, gaps);
  }
  if (level === "pro") {
    return Math.max(4, gaps + 1);
  }
  return Math.max(3, gaps + 1);
}

function getNumericDistractorCount(level: PatternLevel, gaps: number): number {
  if (level === "kids") {
    return Math.max(2, gaps);
  }
  if (level === "pro") {
    return Math.max(4, gaps + 1);
  }
  return Math.max(3, gaps + 1);
}

function buildVisualOptions(
  correctAnswers: PatternElement[],
  level: PatternLevel,
  gaps: number,
  elementTypes: VisualFeature[]
): { options: PatternElement[]; correctIndices: number[] } {
  const uniqueCorrectAnswers: PatternElement[] = [];
  for (const answer of correctAnswers) {
    if (!uniqueCorrectAnswers.some((option) => elementsEqual(option, answer))) {
      uniqueCorrectAnswers.push({ ...answer });
    }
  }

  const options = [...uniqueCorrectAnswers];
  const targetCount = uniqueCorrectAnswers.length + getVisualDistractorCount(level, gaps);
  const distractorBase = correctAnswers[0] ?? createBaseElement();

  while (options.length < targetCount) {
    const wrong = createDistractorElement(distractorBase, elementTypes, level, options);
    if (!options.some((option) => elementsEqual(option, wrong))) {
      options.push(wrong);
    }
  }

  const shuffledOptions = shuffle(options);
  const correctIndices = correctAnswers.map((answer) =>
    shuffledOptions.findIndex((option) => elementsEqual(option, answer))
  );

  return { options: shuffledOptions, correctIndices };
}

function buildNumericOptions(
  correctAnswers: number[],
  wrongCandidates: number[],
  level: PatternLevel,
  gaps: number
): { options: number[]; correctIndices: number[] } {
  const uniqueCorrectAnswers = [...new Set(correctAnswers)];
  const options = [...uniqueCorrectAnswers];
  const targetCount = uniqueCorrectAnswers.length + getNumericDistractorCount(level, gaps);

  for (const candidate of shuffle(wrongCandidates)) {
    if (candidate > 0 && !options.includes(candidate)) {
      options.push(candidate);
    }
    if (options.length >= targetCount) {
      break;
    }
  }

  while (options.length < targetCount) {
    const fallback = randomInt(1, 120);
    if (!options.includes(fallback)) {
      options.push(fallback);
    }
  }

  const shuffledOptions = shuffle(options);
  const correctIndices = correctAnswers.map((answer) => shuffledOptions.indexOf(answer));

  return { options: shuffledOptions, correctIndices };
}

function createVisualTailQuestion(params: {
  idPrefix: string;
  patternType: PatternType;
  level: PatternLevel;
  fullSequence: PatternElement[];
  gaps: number;
  hint: string;
  explanation: string;
  elementTypes: VisualFeature[];
}): PatternQuestion {
  const visibleSequence = params.fullSequence.slice(0, Math.max(1, params.fullSequence.length - params.gaps));
  const correctAnswers = params.fullSequence.slice(-params.gaps);
  const { options, correctIndices } = buildVisualOptions(
    correctAnswers,
    params.level,
    params.gaps,
    params.elementTypes
  );

  return {
    id: `${params.idPrefix}-${Date.now()}-${Math.random()}`,
    patternType: params.patternType,
    sequence: visibleSequence,
    options,
    correctIndex: params.gaps === 1 ? (correctIndices[0] ?? 0) : correctIndices,
    level: params.level,
    contentType: "visual",
    hint: params.hint,
    explanation: params.explanation,
    sequenceLength: visibleSequence.length,
    answersNeeded: params.gaps,
    gaps: params.gaps,
    userAnswers: []
  };
}

function createNumericTailQuestion(params: {
  idPrefix: string;
  patternType: NumericPatternType;
  level: PatternLevel;
  fullSequence: number[];
  gaps: number;
  hint: string;
  explanation: string;
  mathRule: string;
  wrongCandidates: number[];
}): PatternQuestion {
  const visibleSequence = params.fullSequence.slice(0, Math.max(1, params.fullSequence.length - params.gaps));
  const correctAnswers = params.fullSequence.slice(-params.gaps);
  const { options, correctIndices } = buildNumericOptions(
    correctAnswers,
    params.wrongCandidates,
    params.level,
    params.gaps
  );

  return {
    id: `${params.idPrefix}-${Date.now()}-${Math.random()}`,
    patternType: params.patternType,
    sequence: visibleSequence,
    options,
    correctIndex: params.gaps === 1 ? (correctIndices[0] ?? 0) : correctIndices,
    level: params.level,
    contentType: "numeric",
    hint: params.hint,
    explanation: params.explanation,
    mathRule: params.mathRule,
    sequenceLength: visibleSequence.length,
    answersNeeded: params.gaps,
    gaps: params.gaps,
    userAnswers: []
  };
}

function applyVisualFeature(
  element: PatternElement,
  feature: VisualFeature,
  value: PatternColor | PatternShape | PatternSize
): PatternElement {
  if (feature === "color") {
    return { ...element, color: value as PatternColor };
  }
  if (feature === "shape") {
    return { ...element, shape: value as PatternShape };
  }
  return { ...element, size: value as PatternSize };
}

function getVisualFeatureLabel(feature: VisualFeature): string {
  if (feature === "color") {
    return "цвет";
  }
  if (feature === "shape") {
    return "форма";
  }
  return "размер";
}

function getStageLabel(stage: PatternDifficultyProfile["stage"]): string {
  if (stage === "foundation") {
    return "База";
  }
  if (stage === "challenge") {
    return "Челлендж";
  }
  return "Разгон";
}

function resolveProgressiveStage(
  level: PatternLevel,
  questionIndex: number,
  streak: number,
  errorCount: number
): PatternDifficultyProfile["stage"] {
  if (level === "kids") {
    return questionIndex >= 3 && streak >= 2 ? "build" : "foundation";
  }

  if (level === "standard") {
    if (questionIndex >= 4 && streak >= 2 && errorCount === 0) {
      return "challenge";
    }
    if (questionIndex >= 2 || streak >= 2) {
      return "build";
    }
    return "foundation";
  }

  if (questionIndex >= 4 && streak >= 2 && errorCount === 0) {
    return "challenge";
  }
  if (questionIndex >= 1 || streak >= 1) {
    return "build";
  }
  return "foundation";
}

function buildDifficultyDescription(
  modeId: PatternModeId | undefined,
  stage: PatternDifficultyProfile["stage"],
  gaps: number,
  level: PatternLevel
): string {
  if (modeId === "pattern_multi") {
    return gaps === 1
      ? "1 пропуск в хвосте ряда."
      : `${gaps} пропуска в хвосте ряда. Иногда один и тот же вариант нужно выбрать повторно.`;
  }

  if (modeId === "pattern_learning") {
    return "1 пропуск и самые читаемые семьи правил с подсказками.";
  }

  if (modeId === "pattern_timed") {
    return "1 пропуск и быстрый ритм без перегруза несколькими слотами.";
  }

  if (modeId === "pattern_survival") {
    if (stage === "foundation") {
      return "Старт с 1 пропуска. Держите серию — ошибка усложнит задачу!";
    }
    if (stage === "challenge") {
      return gaps > 1
        ? `${gaps} пропуска. Ошибок: ${level === "kids" ? "1" : "2"}/3. Держитесь!`
        : "Сложность растёт. Ошибка приближает конец игры.";
    }
    return "1 пропуск. После ошибки сложность вырастет.";
  }

  if (modeId === "pattern_progressive") {
    if (stage === "foundation") {
      return "Старт с 1 пропуска и самых читаемых семейств.";
    }
    if (stage === "challenge") {
      return gaps > 1
        ? `${gaps} пропуска и более жёсткие семьи правил внутри раунда.`
        : "Более жёсткие семьи правил внутри раунда.";
    }
    return gaps > 1
      ? `${gaps} пропуска и расширенный набор правил.`
      : "1 пропуск и расширенный набор правил.";
  }

  if (modeId === "pattern_classic" && level === "pro" && gaps > 1) {
    return "В основном 1 пропуск, но иногда встречаются 2 пропуска для контрольной проверки.";
  }

  return gaps > 1 ? `${gaps} пропуска и стабильный набор правил.` : "1 пропуск и стабильный набор правил.";
}

function filterPatternTypesByContent(
  types: PatternType[],
  contentType: PatternContentType
): PatternType[] {
  return types.filter((type) => {
    if (contentType === "visual") {
      return !type.startsWith("MATH_");
    }
    if (contentType === "numeric") {
      return type.startsWith("MATH_");
    }
    return true;
  });
}

const patternTypesByLevel: Record<PatternLevel, PatternType[]> = {
  kids: ["ABAB", "AABB", "MATH_SEQUENCE", "MATH_FIBONACCI"],
  standard: [
    "ABAB",
    "AABB",
    "PROGRESSION",
    "CYCLE",
    "MIRROR",
    "MATH_SEQUENCE",
    "MATH_ARITHMETIC",
    "MATH_FIBONACCI",
    "MATH_GEOMETRIC"
  ],
  pro: [
    "ABAB",
    "AABB",
    "PROGRESSION",
    "CYCLE",
    "MIRROR",
    "MATH_SEQUENCE",
    "MATH_ARITHMETIC",
    "MATH_ALTERNATING",
    "MATH_FIBONACCI",
    "MATH_GEOMETRIC",
    "MATH_PRIME",
    "MATH_SQUARES"
  ]
};

const patternWeights: Record<PatternLevel, Record<PatternType, number>> = {
  kids: {
    ABAB: 35,
    AABB: 35,
    PROGRESSION: 0,
    CYCLE: 0,
    MIRROR: 0,
    MATH_SEQUENCE: 15,
    MATH_ARITHMETIC: 0,
    MATH_ALTERNATING: 0,
    MATH_FIBONACCI: 10,
    MATH_GEOMETRIC: 5,
    MATH_PRIME: 0,
    MATH_SQUARES: 0
  },
  standard: {
    ABAB: 20,
    AABB: 15,
    PROGRESSION: 12,
    CYCLE: 12,
    MIRROR: 8,
    MATH_SEQUENCE: 10,
    MATH_ARITHMETIC: 5,
    MATH_ALTERNATING: 5,
    MATH_FIBONACCI: 8,
    MATH_GEOMETRIC: 5,
    MATH_PRIME: 0,
    MATH_SQUARES: 0
  },
  pro: {
    ABAB: 8,
    AABB: 8,
    PROGRESSION: 10,
    CYCLE: 10,
    MIRROR: 8,
    MATH_SEQUENCE: 10,
    MATH_ARITHMETIC: 8,
    MATH_ALTERNATING: 8,
    MATH_FIBONACCI: 10,
    MATH_GEOMETRIC: 8,
    MATH_PRIME: 6,
    MATH_SQUARES: 6
  }
};

function getPatternPoolForMode(
  level: PatternLevel,
  contentType: PatternContentType,
  options: PatternGenerationOptions,
  stage: PatternDifficultyProfile["stage"]
): PatternType[] {
  const baseTypes = filterPatternTypesByContent(patternTypesByLevel[level], contentType);

  if (options.modeId === "pattern_learning") {
    const learningTypes: PatternType[] =
      level === "kids"
        ? ["ABAB", "AABB", "MATH_SEQUENCE"]
        : level === "standard"
          ? ["ABAB", "AABB", "PROGRESSION", "CYCLE", "MATH_SEQUENCE"]
          : ["ABAB", "PROGRESSION", "CYCLE", "MATH_SEQUENCE", "MATH_ARITHMETIC"];
    const filtered = filterPatternTypesByContent(learningTypes, contentType);
    return filtered.length > 0 ? filtered : baseTypes;
  }

  if (options.modeId === "pattern_progressive") {
    const ladderTypes: Record<PatternDifficultyProfile["stage"], PatternType[]> =
      level === "kids"
        ? {
            foundation: ["ABAB", "AABB", "MATH_SEQUENCE"],
            build: ["ABAB", "AABB", "MATH_SEQUENCE"],
            challenge: ["ABAB", "AABB", "MATH_SEQUENCE"]
          }
        : level === "standard"
          ? {
              foundation: ["ABAB", "AABB", "MATH_SEQUENCE"],
              build: ["ABAB", "AABB", "PROGRESSION", "CYCLE", "MATH_SEQUENCE", "MATH_ARITHMETIC"],
              challenge: ["ABAB", "AABB", "CYCLE", "MIRROR", "MATH_SEQUENCE", "MATH_ARITHMETIC"]
            }
          : {
              foundation: ["ABAB", "PROGRESSION", "CYCLE", "MATH_SEQUENCE", "MATH_ARITHMETIC"],
              build: ["ABAB", "AABB", "PROGRESSION", "CYCLE", "MIRROR", "MATH_ARITHMETIC", "MATH_ALTERNATING"],
              challenge: ["AABB", "CYCLE", "MIRROR", "MATH_SEQUENCE", "MATH_ARITHMETIC", "MATH_ALTERNATING"]
            };
    const filtered = filterPatternTypesByContent(ladderTypes[stage], contentType);
    return filtered.length > 0 ? filtered : baseTypes;
  }

  if (options.modeId === "pattern_timed") {
    const timedTypes: PatternType[] =
      level === "kids"
        ? ["ABAB", "AABB", "MATH_SEQUENCE"]
        : level === "standard"
          ? ["ABAB", "AABB", "PROGRESSION", "CYCLE", "MATH_SEQUENCE", "MATH_ARITHMETIC"]
          : ["ABAB", "PROGRESSION", "CYCLE", "MIRROR", "MATH_SEQUENCE", "MATH_ARITHMETIC", "MATH_ALTERNATING"];
    const filtered = filterPatternTypesByContent(timedTypes, contentType);
    return filtered.length > 0 ? filtered : baseTypes;
  }

  if (options.modeId === "pattern_survival") {
    // В survival режиме постепенно открываем все типы паттернов
    const survivalTypes: Record<PatternDifficultyProfile["stage"], PatternType[]> =
      level === "kids"
        ? {
            foundation: ["ABAB", "AABB", "MATH_SEQUENCE", "MATH_FIBONACCI"],
            build: ["ABAB", "AABB", "MATH_SEQUENCE", "MATH_FIBONACCI", "MATH_GEOMETRIC"],
            challenge: ["ABAB", "AABB", "PROGRESSION", "MATH_SEQUENCE", "MATH_FIBONACCI", "MATH_GEOMETRIC"]
          }
        : level === "standard"
          ? {
              foundation: ["ABAB", "AABB", "MATH_SEQUENCE", "MATH_FIBONACCI"],
              build: ["ABAB", "AABB", "PROGRESSION", "CYCLE", "MATH_SEQUENCE", "MATH_ARITHMETIC", "MATH_FIBONACCI"],
              challenge: [
                "ABAB",
                "AABB",
                "PROGRESSION",
                "CYCLE",
                "MIRROR",
                "MATH_SEQUENCE",
                "MATH_ARITHMETIC",
                "MATH_FIBONACCI",
                "MATH_GEOMETRIC"
              ]
            }
          : {
              foundation: ["ABAB", "PROGRESSION", "MATH_SEQUENCE", "MATH_FIBONACCI", "MATH_GEOMETRIC"],
              build: [
                "ABAB",
                "AABB",
                "PROGRESSION",
                "CYCLE",
                "MATH_SEQUENCE",
                "MATH_ARITHMETIC",
                "MATH_FIBONACCI",
                "MATH_GEOMETRIC"
              ],
              challenge: [
                "ABAB",
                "AABB",
                "PROGRESSION",
                "CYCLE",
                "MIRROR",
                "MATH_SEQUENCE",
                "MATH_ARITHMETIC",
                "MATH_ALTERNATING",
                "MATH_FIBONACCI",
                "MATH_GEOMETRIC",
                "MATH_PRIME",
                "MATH_SQUARES"
              ]
            };
    const filtered = filterPatternTypesByContent(survivalTypes[stage], contentType);
    return filtered.length > 0 ? filtered : baseTypes;
  }

  return baseTypes;
}

export function resolvePatternDifficulty(
  level: PatternLevel,
  contentType: PatternContentType,
  options: PatternGenerationOptions
): PatternDifficultyProfile {
  const streak = options.adaptiveState?.streak ?? 0;
  const errorCount = options.adaptiveState?.errorCount ?? 0;
  const requestedGaps = Math.max(1, options.gaps ?? 1);
  const questionIndex = options.questionIndex ?? 0;
  let stage: PatternDifficultyProfile["stage"] = "build";
  let gaps = 1;

  if (options.modeId === "pattern_learning") {
    stage = "foundation";
    gaps = 1;
  } else if (options.modeId === "pattern_multi") {
    stage = "challenge";
    gaps = level === "kids" ? 2 : Math.min(3, requestedGaps);
  } else if (options.modeId === "pattern_survival") {
    // В survival режиме сложность растёт с каждой ошибкой
    if (errorCount === 0) {
      stage = "foundation";
    } else if (errorCount === 1) {
      stage = "build";
    } else {
      stage = "challenge";
    }
    gaps = stage === "challenge" && level !== "kids" ? 2 : 1;
  } else if (options.modeId === "pattern_progressive") {
    stage = resolveProgressiveStage(level, questionIndex, streak, errorCount);
    gaps =
      stage === "foundation"
        ? 1
        : level === "kids"
          ? 1
          : level === "standard"
            ? stage === "challenge"
              ? 2
              : 1
            : stage === "challenge"
              ? 2
              : 2;
  } else if (options.modeId === "pattern_classic" && level === "pro") {
    stage = "challenge";
    gaps = (questionIndex + 1) % 4 === 0 ? 2 : 1;
  } else if (options.multiGap || requestedGaps > 1) {
    stage = "challenge";
    gaps = Math.min(3, requestedGaps);
  } else if (level === "kids") {
    stage = "foundation";
  }

  const allowedTypes = getPatternPoolForMode(level, contentType, options, stage);
  const filteredAllowedTypes =
    gaps > 1 ? allowedTypes.filter((type) => MULTI_GAP_SUPPORTED_TYPES.has(type)) : allowedTypes;

  return {
    level,
    stage,
    stageLabel: getStageLabel(stage),
    description: buildDifficultyDescription(options.modeId, stage, gaps, level),
    gaps,
    allowedTypes: filteredAllowedTypes.length > 0 ? filteredAllowedTypes : allowedTypes
  };
}

function generateABAB(level: PatternLevel, elementTypes: VisualFeature[], gaps = 1): PatternQuestion {
  const baseVisibleLength = level === "kids" ? 4 : level === "standard" ? 5 : 6;
  const elementA = createBaseElement();
  const elementB = createDistinctElement(elementA, elementTypes, [elementA]);
  const fullSequence = Array.from({ length: baseVisibleLength + gaps }, (_, index) =>
    index % 2 === 0 ? { ...elementA } : { ...elementB }
  );

  return createVisualTailQuestion({
    idPrefix: "abab",
    patternType: "ABAB",
    level,
    fullSequence,
    gaps,
    hint: "Чередование A, B, A, B...",
    explanation:
      gaps > 1
        ? `Паттерн чередуется между двумя элементами. Заполните ${gaps} пропуска по порядку.`
        : "Паттерн чередуется между двумя элементами.",
    elementTypes
  });
}

function generateAABB(level: PatternLevel, elementTypes: VisualFeature[], gaps = 1): PatternQuestion {
  const baseVisibleLength = level === "kids" ? 4 : level === "standard" ? 6 : 8;
  const elementA = createBaseElement();
  const elementB = createDistinctElement(elementA, elementTypes, [elementA]);
  const fullSequence = Array.from({ length: baseVisibleLength + gaps }, (_, index) => {
    const pairIndex = Math.floor(index / 2);
    return pairIndex % 2 === 0 ? { ...elementA } : { ...elementB };
  });

  return createVisualTailQuestion({
    idPrefix: "aabb",
    patternType: "AABB",
    level,
    fullSequence,
    gaps,
    hint: "Пары: A, A, B, B...",
    explanation:
      gaps > 1
        ? "Каждый элемент повторяется дважды. Продолжайте пары и не сбивайтесь с ритма."
        : "Каждый элемент повторяется дважды. После пары B начинается новая пара A.",
    elementTypes
  });
}

function generateProgression(level: PatternLevel, elementTypes: VisualFeature[], gaps = 1): PatternQuestion {
  const baseVisibleLength = level === "kids" ? 3 : level === "standard" ? 4 : 5;
  const activeTypes = elementTypes.length > 0 ? elementTypes : ALL_ELEMENT_TYPES;
  const feature = pickRandom(activeTypes);
  const baseElement = createBaseElement();
  const featureValues =
    feature === "color"
      ? shuffle(PATTERN_COLORS).slice(0, 3)
      : feature === "shape"
        ? shuffle(PATTERN_SHAPES).slice(0, 3)
        : (["small", "medium", "large"] as PatternSize[]);
  const fullSequence = Array.from({ length: baseVisibleLength + gaps }, (_, index) => {
    const valueIndex = Math.min(index, featureValues.length - 1);
    return applyVisualFeature(baseElement, feature, featureValues[valueIndex]);
  });

  return createVisualTailQuestion({
    idPrefix: "progression",
    patternType: "PROGRESSION",
    level,
    fullSequence,
    gaps,
    hint: `Прогрессия: меняется ${getVisualFeatureLabel(feature)}`,
    explanation:
      gaps > 1
        ? `Следите за прогрессией по признаку «${getVisualFeatureLabel(feature)}» и заполните хвост ряда.`
        : `Каждый следующий элемент продолжает прогрессию по признаку «${getVisualFeatureLabel(feature)}».`,
    elementTypes
  });
}

function generateCycle(level: PatternLevel, elementTypes: VisualFeature[], gaps = 1): PatternQuestion {
  const baseVisibleLength = level === "kids" ? 5 : level === "standard" ? 6 : 8;
  const elementA = createBaseElement();
  const elementB = createDistinctElement(elementA, elementTypes, [elementA]);
  const elementC = createDistinctElement(elementA, elementTypes, [elementA, elementB]);
  const cycleElements = [elementA, elementB, elementC];
  const fullSequence = Array.from({ length: baseVisibleLength + gaps }, (_, index) => ({
    ...cycleElements[index % cycleElements.length]
  }));

  return createVisualTailQuestion({
    idPrefix: "cycle",
    patternType: "CYCLE",
    level,
    fullSequence,
    gaps,
    hint: "Цикл из 3 элементов: A, B, C, A, B...",
    explanation:
      gaps > 1
        ? "Паттерн повторяется тройками. Продолжайте цикл и заполняйте пропуски слева направо."
        : "Паттерн повторяется каждые 3 элемента.",
    elementTypes
  });
}

function generateMirror(level: PatternLevel, elementTypes: VisualFeature[], gaps = 1): PatternQuestion {
  const baseVisibleLength = level === "kids" ? 4 : level === "standard" ? 6 : 8;
  const elementA = createBaseElement();
  const elementB = createDistinctElement(elementA, elementTypes, [elementA]);
  const mirrorCycle = [elementA, elementB, elementB, elementA];
  const fullSequence = Array.from({ length: baseVisibleLength + gaps }, (_, index) => ({
    ...mirrorCycle[index % mirrorCycle.length]
  }));

  return createVisualTailQuestion({
    idPrefix: "mirror",
    patternType: "MIRROR",
    level,
    fullSequence,
    gaps,
    hint: "Зеркало: A, B, B, A...",
    explanation:
      gaps > 1
        ? "Здесь важно удержать зеркальный ритм и дописать концовку без перескока."
        : "Паттерн зеркально отражается и затем начинает новый цикл.",
    elementTypes
  });
}

function generateMathSequence(level: PatternLevel, gaps = 1): PatternQuestion {
  const start = randomInt(1, 10);
  const step = randomInt(2, 5);
  const baseVisibleLength = level === "kids" ? 4 : level === "standard" ? 5 : 6;
  const fullSequence = Array.from({ length: baseVisibleLength + gaps }, (_, index) => start + index * step);
  const lastVisible = fullSequence[baseVisibleLength - 1];

  return createNumericTailQuestion({
    idPrefix: "math-seq",
    patternType: "MATH_SEQUENCE",
    level,
    fullSequence,
    gaps,
    mathRule: `+${step}`,
    hint: `Каждое число больше предыдущего на ${step}.`,
    explanation:
      gaps > 1
        ? `Продолжите арифметический шаг +${step} ещё на ${gaps} позиции после ${lastVisible}.`
        : `Последовательность увеличивается на ${step}.`,
    wrongCandidates: [
      ...fullSequence.slice(-gaps).map((value) => value - 1),
      ...fullSequence.slice(-gaps).map((value) => value + 1),
      ...fullSequence.slice(-gaps).map((value) => value + step),
      ...fullSequence.slice(-gaps).map((value) => value - step)
    ]
  });
}

function generateMathArithmetic(level: PatternLevel, gaps = 1): PatternQuestion {
  const start = randomInt(2, 15);
  const step = level === "kids" ? randomInt(1, 3) : randomInt(3, 7);
  const baseVisibleLength = level === "kids" ? 4 : level === "standard" ? 5 : 6;
  const fullSequence = Array.from({ length: baseVisibleLength + gaps }, (_, index) => start + index * step);

  return createNumericTailQuestion({
    idPrefix: "math-arith",
    patternType: "MATH_ARITHMETIC",
    level,
    fullSequence,
    gaps,
    mathRule: `a1=${start}, d=${step}`,
    hint: `Арифметическая прогрессия с шагом ${step}.`,
    explanation:
      gaps > 1
        ? `Продлите прогрессию с шагом ${step} и заполните ${gaps} пропуска.`
        : `Арифметическая прогрессия: каждое число = предыдущее + ${step}.`,
    wrongCandidates: [
      ...fullSequence.slice(-gaps).map((value) => value + randomInt(-4, 4)),
      ...fullSequence.slice(-gaps).map((value) => value + step + 1),
      ...fullSequence.slice(-gaps).map((value) => value - step - 1)
    ]
  });
}

function generateMathAlternating(level: PatternLevel, gaps = 1): PatternQuestion {
  const start = randomInt(5, 20);
  const add = randomInt(2, 5);
  const subtract = randomInt(1, 3);
  const baseVisibleLength = level === "kids" ? 4 : level === "standard" ? 5 : 6;
  const fullSequence: number[] = [start];

  for (let index = 1; index < baseVisibleLength + gaps; index += 1) {
    const previous = fullSequence[index - 1];
    fullSequence.push(index % 2 === 1 ? previous + add : previous - subtract);
  }

  return createNumericTailQuestion({
    idPrefix: "math-alt",
    patternType: "MATH_ALTERNATING",
    level,
    fullSequence,
    gaps,
    mathRule: `+${add}, -${subtract}`,
    hint: `Операции чередуются: +${add}, затем -${subtract}.`,
    explanation:
      gaps > 1
        ? `Сохраните чередование +${add} и -${subtract} на всех ${gaps} пропусках.`
        : `Операции идут по кругу: +${add}, затем -${subtract}.`,
    wrongCandidates: [
      ...fullSequence.slice(-gaps).map((value) => value + 1),
      ...fullSequence.slice(-gaps).map((value) => value - 1),
      ...fullSequence.slice(-gaps).map((value) => value + add),
      ...fullSequence.slice(-gaps).map((value) => value - subtract)
    ]
  });
}

function generateMathFibonacci(level: PatternLevel, gaps = 1): PatternQuestion {
  const baseVisibleLength = level === "kids" ? 5 : level === "standard" ? 6 : 7;
  const fullSequence: number[] = [1, 1];

  for (let index = 2; index < baseVisibleLength + gaps; index += 1) {
    fullSequence.push(fullSequence[index - 1] + fullSequence[index - 2]);
  }

  const lastVisible = fullSequence[baseVisibleLength - 1];
  const nextValue = fullSequence[baseVisibleLength];

  return createNumericTailQuestion({
    idPrefix: "math-fib",
    patternType: "MATH_FIBONACCI",
    level,
    fullSequence,
    gaps,
    mathRule: "F(n) = F(n-1) + F(n-2)",
    hint: "Каждое число = сумма двух предыдущих.",
    explanation:
      gaps > 1
        ? `Продолжите последовательность Фибоначчи: каждое следующее число = сумма двух предыдущих после ${lastVisible}.`
        : `Число Фибоначчи после ${lastVisible} = ${nextValue}.`,
    wrongCandidates: [
      lastVisible + 1,
      lastVisible + 2,
      lastVisible * 2,
      Math.round(lastVisible * 1.5),
      lastVisible + Math.round(lastVisible / 2)
    ]
  });
}

function generateMathGeometric(level: PatternLevel, gaps = 1): PatternQuestion {
  const start = randomInt(2, 5);
  const ratio = level === "kids" ? 2 : level === "standard" ? randomInt(2, 3) : randomInt(3, 4);
  const baseVisibleLength = level === "kids" ? 4 : level === "standard" ? 5 : 6;
  const fullSequence: number[] = [start];

  for (let index = 1; index < baseVisibleLength + gaps; index += 1) {
    fullSequence.push(fullSequence[index - 1] * ratio);
  }

  const lastVisible = fullSequence[baseVisibleLength - 1];

  return createNumericTailQuestion({
    idPrefix: "math-geo",
    patternType: "MATH_GEOMETRIC",
    level,
    fullSequence,
    gaps,
    mathRule: `×${ratio}`,
    hint: `Каждое число больше предыдущего в ${ratio} раз.`,
    explanation:
      gaps > 1
        ? `Продолжите геометрическую прогрессию: умножайте на ${ratio} после ${lastVisible}.`
        : `Геометрическая прогрессия: каждое число = предыдущее × ${ratio}.`,
    wrongCandidates: [
      ...fullSequence.slice(-gaps).map((value) => value + ratio),
      ...fullSequence.slice(-gaps).map((value) => value * (ratio - 1)),
      ...fullSequence.slice(-gaps).map((value) => value * (ratio + 1)),
      ...fullSequence.slice(-gaps).map((value) => value + randomInt(5, 15))
    ]
  });
}

function generateMathPrime(level: PatternLevel, gaps = 1): PatternQuestion {
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71];
  const startIndex = level === "kids" ? 0 : level === "standard" ? randomInt(0, 3) : randomInt(2, 6);
  const baseVisibleLength = level === "kids" ? 5 : level === "standard" ? 6 : 7;
  const fullSequence = primes.slice(startIndex, startIndex + baseVisibleLength + gaps);

  while (fullSequence.length < baseVisibleLength + gaps) {
    const lastPrime = fullSequence[fullSequence.length - 1];
    for (let candidate = lastPrime + 1; candidate < 200; candidate += 1) {
      let isPrime = true;
      for (let divisor = 2; divisor <= Math.sqrt(candidate); divisor += 1) {
        if (candidate % divisor === 0) {
          isPrime = false;
          break;
        }
      }
      if (isPrime) {
        fullSequence.push(candidate);
        break;
      }
    }
  }

  const lastVisible = fullSequence[baseVisibleLength - 1];

  return createNumericTailQuestion({
    idPrefix: "math-prime",
    patternType: "MATH_PRIME",
    level,
    fullSequence,
    gaps,
    mathRule: "prime numbers",
    hint: "Простые числа (делятся только на 1 и на себя).",
    explanation:
      gaps > 1
        ? `Продолжите последовательность простых чисел после ${lastVisible}.`
        : `Следующее простое число после ${lastVisible}.`,
    wrongCandidates: [
      ...fullSequence.slice(-gaps).map((value) => value + 1),
      ...fullSequence.slice(-gaps).map((value) => value + 2),
      ...fullSequence.slice(-gaps).map((value) => value + 4),
      ...fullSequence.slice(-gaps).map((value) => value + randomInt(3, 8))
    ]
  });
}

function generateMathSquares(level: PatternLevel, gaps = 1): PatternQuestion {
  const baseVisibleLength = level === "kids" ? 4 : level === "standard" ? 5 : 6;
  const startN = level === "kids" ? 1 : level === "standard" ? randomInt(1, 3) : randomInt(2, 5);
  const fullSequence: number[] = [];

  for (let index = 0; index < baseVisibleLength + gaps; index += 1) {
    const n = startN + index;
    fullSequence.push(n * n);
  }

  const lastVisible = fullSequence[baseVisibleLength - 1];
  const lastN = startN + baseVisibleLength - 1;

  return createNumericTailQuestion({
    idPrefix: "math-sq",
    patternType: "MATH_SQUARES",
    level,
    fullSequence,
    gaps,
    mathRule: "n²",
    hint: "Квадраты чисел: 1²=1, 2²=4, 3²=9...",
    explanation:
      gaps > 1
        ? `Продолжите последовательность квадратов: после ${lastN}²=${lastVisible} идёт ${lastN + 1}²=${(lastN + 1) * (lastN + 1)}.`
        : `Квадрат числа ${lastN + 1} = ${(lastN + 1) * (lastN + 1)}.`,
    wrongCandidates: [
      ...fullSequence.slice(-gaps).map((value) => value + 1),
      ...fullSequence.slice(-gaps).map((value) => value + randomInt(2, 8)),
      ...fullSequence.slice(-gaps).map((value) => value * 2),
      lastVisible + (lastN * 2) + 1,
      lastVisible + (lastN * 2) - 1
    ]
  });
}

function selectPatternType(level: PatternLevel, availableTypes: PatternType[]): PatternType {
  if (availableTypes.length === 0) {
    return patternTypesByLevel[level][0];
  }

  const weightedTypes = availableTypes.filter((type) => patternWeights[level][type] > 0);
  if (weightedTypes.length === 0) {
    return availableTypes[0];
  }

  const totalWeight = weightedTypes.reduce((sum, type) => sum + patternWeights[level][type], 0);
  let random = Math.random() * totalWeight;

  for (const type of weightedTypes) {
    random -= patternWeights[level][type];
    if (random <= 0) {
      return type;
    }
  }

  return weightedTypes[0];
}

function generateVisualQuestion(
  patternType: PatternType,
  level: PatternLevel,
  elementTypes: VisualFeature[],
  gaps: number
): PatternQuestion {
  switch (patternType) {
    case "ABAB":
      return generateABAB(level, elementTypes, gaps);
    case "AABB":
      return generateAABB(level, elementTypes, gaps);
    case "PROGRESSION":
      return generateProgression(level, elementTypes, gaps);
    case "CYCLE":
      return generateCycle(level, elementTypes, gaps);
    case "MIRROR":
      return generateMirror(level, elementTypes, gaps);
    default:
      return generateABAB(level, elementTypes, gaps);
  }
}

function generateNumericQuestion(
  patternType: NumericPatternType,
  level: PatternLevel,
  gaps: number
): PatternQuestion {
  switch (patternType) {
    case "MATH_SEQUENCE":
      return generateMathSequence(level, gaps);
    case "MATH_ARITHMETIC":
      return generateMathArithmetic(level, gaps);
    case "MATH_ALTERNATING":
      return generateMathAlternating(level, gaps);
    case "MATH_FIBONACCI":
      return generateMathFibonacci(level, gaps);
    case "MATH_GEOMETRIC":
      return generateMathGeometric(level, gaps);
    case "MATH_PRIME":
      return generateMathPrime(level, gaps);
    case "MATH_SQUARES":
      return generateMathSquares(level, gaps);
    default:
      return generateMathSequence(level, gaps);
  }
}

export function generatePatternQuestion(
  level: PatternLevel,
  elementTypes: VisualFeature[],
  contentType: PatternContentType = "visual",
  patternType?: PatternType,
  options: PatternGenerationOptions = {}
): PatternQuestion {
  const difficulty = resolvePatternDifficulty(level, contentType, options);
  const selectedType = patternType ?? selectPatternType(level, difficulty.allowedTypes);
  const gaps = MULTI_GAP_SUPPORTED_TYPES.has(selectedType) ? difficulty.gaps : 1;

  if (selectedType.startsWith("MATH_")) {
    return generateNumericQuestion(selectedType as NumericPatternType, level, gaps);
  }

  return generateVisualQuestion(selectedType, level, elementTypes, gaps);
}

export function generatePatternQuestions(
  count: number,
  level: PatternLevel,
  elementTypes: VisualFeature[],
  contentType: PatternContentType = "visual",
  options: PatternGenerationOptions = {}
): PatternQuestion[] {
  return Array.from({ length: count }, (_, index) =>
    generatePatternQuestion(level, elementTypes, contentType, undefined, {
      ...options,
      questionIndex: (options.questionIndex ?? 0) + index
    })
  );
}

export function calculatePatternScore(metrics: {
  correctCount: number;
  totalQuestions: number;
  avgLevel: number;
  streakBest: number;
  accuracy: number;
}): number {
  if (metrics.totalQuestions <= 0) {
    return 0;
  }

  const baseScore = (metrics.correctCount / metrics.totalQuestions) * 100;
  const levelMultiplier = 1 + (metrics.avgLevel - 1) * 0.15;
  const streakBonus = 1 + Math.min(metrics.streakBest, 10) * 0.05;

  return Math.round(baseScore * levelMultiplier * streakBonus);
}

export function levelToNumber(level: PatternLevel): number {
  if (level === "kids") {
    return 1;
  }
  if (level === "standard") {
    return 2;
  }
  return 3;
}

export function numberToLevel(value: number): PatternLevel {
  if (value <= 1) {
    return "kids";
  }
  if (value <= 2) {
    return "standard";
  }
  return "pro";
}
