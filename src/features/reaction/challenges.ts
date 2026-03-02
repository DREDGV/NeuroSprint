export type ReactionVariantId =
  | "signal"
  | "stroop_match"
  | "pair_match"
  | "number_match";

export interface ReactionVariant {
  id: ReactionVariantId;
  title: string;
  description: string;
}

export interface ReactionOption {
  id: string;
  label: string;
  secondaryLabel?: string;
  isCorrect: boolean;
  textColor?: string;
}

export interface ReactionChallenge {
  prompt: string;
  options: ReactionOption[];
}

const COLOR_WORDS = [
  { name: "КРАСНЫЙ", value: "#d64545" },
  { name: "СИНИЙ", value: "#2f5fd0" },
  { name: "ЗЕЛЕНЫЙ", value: "#2f9d57" },
  { name: "ЖЕЛТЫЙ", value: "#c99a00" },
  { name: "ОРАНЖЕВЫЙ", value: "#d97a1f" },
  { name: "ФИОЛЕТОВЫЙ", value: "#7a49c8" }
] as const;

const PAIR_SHAPES = [
  { name: "Круг", symbol: "●" },
  { name: "Квадрат", symbol: "■" },
  { name: "Треугольник", symbol: "▲" },
  { name: "Звезда", symbol: "★" }
] as const;

const PAIR_VALUES = [2, 3, 4, 5, 6, 7, 8, 9] as const;

const NUMBER_POOL = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const REACTION_VARIANTS: ReactionVariant[] = [
  {
    id: "signal",
    title: "Сигнал",
    description: "Классический быстрый клик по сигналу."
  },
  {
    id: "stroop_match",
    title: "Цвет и слово",
    description: "Найдите карточку, где цвет текста совпадает с надписью."
  },
  {
    id: "pair_match",
    title: "Пара",
    description: "Найдите нужную пару по подсказке: символ + число."
  },
  {
    id: "number_match",
    title: "Число-цель",
    description: "Найдите и нажмите целевое число в квадратной сетке 2x2."
  }
];

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function pickOne<T>(items: readonly T[]): T {
  return items[randomInt(items.length)];
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    const temp = next[i];
    next[i] = next[j];
    next[j] = temp;
  }
  return next;
}

function pickUniqueNumbers(count: number): number[] {
  const unique = new Set<number>();
  while (unique.size < count) {
    unique.add(pickOne(NUMBER_POOL));
  }
  return [...unique];
}

function buildStroopChallenge(): ReactionChallenge {
  const correct = pickOne(COLOR_WORDS);
  const distractors: ReactionOption[] = [];
  const usedPairs = new Set<string>([`${correct.name}:${correct.value}`]);

  while (distractors.length < 3) {
    const word = pickOne(COLOR_WORDS);
    const color = pickOne(COLOR_WORDS);
    if (word.name === color.name) {
      continue;
    }

    const key = `${word.name}:${color.value}`;
    if (usedPairs.has(key)) {
      continue;
    }

    usedPairs.add(key);
    distractors.push({
      id: key,
      label: word.name,
      textColor: color.value,
      isCorrect: false
    });
  }

  const options = shuffle([
    {
      id: `${correct.name}:${correct.value}`,
      label: correct.name,
      textColor: correct.value,
      isCorrect: true
    },
    ...distractors
  ]);

  return {
    prompt: "Найдите карточку, где цвет текста совпадает с надписью.",
    options
  };
}

function buildPairChallenge(): ReactionChallenge {
  const targetShape = pickOne(PAIR_SHAPES);
  const targetValue = pickOne(PAIR_VALUES);

  let altShape = pickOne(PAIR_SHAPES);
  while (altShape.name === targetShape.name) {
    altShape = pickOne(PAIR_SHAPES);
  }

  let altValue = pickOne(PAIR_VALUES);
  while (altValue === targetValue) {
    altValue = pickOne(PAIR_VALUES);
  }

  const options = shuffle([
    {
      id: `${targetShape.name}-${targetValue}`,
      label: targetShape.symbol,
      secondaryLabel: String(targetValue),
      isCorrect: true
    },
    {
      id: `${targetShape.name}-${altValue}`,
      label: targetShape.symbol,
      secondaryLabel: String(altValue),
      isCorrect: false
    },
    {
      id: `${altShape.name}-${targetValue}`,
      label: altShape.symbol,
      secondaryLabel: String(targetValue),
      isCorrect: false
    },
    {
      id: `${altShape.name}-${altValue}`,
      label: altShape.symbol,
      secondaryLabel: String(altValue),
      isCorrect: false
    }
  ]);

  return {
    prompt: `Найдите пару: ${targetShape.symbol} + ${targetValue}.`,
    options
  };
}

function buildNumberChallenge(): ReactionChallenge {
  const numbers = pickUniqueNumbers(4);
  const target = numbers[randomInt(numbers.length)] ?? 1;
  const options = shuffle(
    numbers.map((value) => ({
      id: `n-${value}`,
      label: String(value),
      isCorrect: value === target
    }))
  );

  return {
    prompt: `Найдите число: ${target}.`,
    options
  };
}

export function buildReactionChallenge(variantId: ReactionVariantId): ReactionChallenge | null {
  if (variantId === "signal") {
    return null;
  }
  if (variantId === "stroop_match") {
    return buildStroopChallenge();
  }
  if (variantId === "pair_match") {
    return buildPairChallenge();
  }
  return buildNumberChallenge();
}
