import type {
  PatternContentType,
  PatternLevel,
  PatternModeId,
  PatternSetup
} from "../../../shared/types/pattern";

export const PATTERN_MODES: Array<{
  id: PatternModeId;
  title: string;
  description: string;
}> = [
  {
    id: "pattern_classic",
    title: "Классический",
    description: "Фиксированная серия без таймера. Хорошо подходит для честной тренировки точности."
  },
  {
    id: "pattern_timed",
    title: "На время",
    description: "Короткие раунды с упором на темп. Важно удержать точность без лишних пауз."
  },
  {
    id: "pattern_progressive",
    title: "Прогрессивный",
    description: "Адаптивный раунд: может повышать, удерживать или смягчать ступень в зависимости от серии и ошибок."
  },
  {
    id: "pattern_learning",
    title: "Обучающий",
    description: "Один пропуск за раз, подсказки включены, сложные семьи вводятся мягче."
  },
  {
    id: "pattern_multi",
    title: "Мульти-ответ",
    description: "2-3 пропуска подряд в конце ряда. Ответы нужно заполнять по порядку."
  },
  {
    id: "pattern_survival",
    title: "Выживание",
    description: "Игра до 3 ошибок. После каждой ошибки сложность растёт. Прдержитесь как можно дольше!"
  }
];

export const PATTERN_LEVELS: Array<{
  id: PatternLevel;
  title: string;
  description: string;
}> = [
  {
    id: "kids",
    title: "Kids",
    description: "Простые циклы и один пропуск. Подходит для спокойного чтения базового правила."
  },
  {
    id: "standard",
    title: "Standard",
    description: "Больше семейств паттернов, длиннее ряды и плотнее отвлекающие варианты."
  },
  {
    id: "pro",
    title: "Pro",
    description: "Длинные последовательности, более близкие distractors и multi-gap эпизоды в рабочих режимах."
  }
];

export const CONTENT_TYPES: Array<{
  id: PatternContentType;
  title: string;
  icon: string;
}> = [
  {
    id: "visual",
    title: "Визуальные",
    icon: "Фигуры"
  },
  {
    id: "numeric",
    title: "Числовые",
    icon: "Числа"
  },
  {
    id: "mixed",
    title: "Микс",
    icon: "Смешанный"
  }
];

export const DEFAULT_PATTERN_SETUP: PatternSetup = {
  modeId: "pattern_classic",
  level: "standard",
  durationSec: 60,
  questionCount: 15,
  elementTypes: ["color", "shape"],
  contentType: "visual",
  showHints: false
};

export function normalizePatternSetup(setup: Partial<PatternSetup>): PatternSetup {
  const modeId = setup.modeId ?? "pattern_classic";
  const level = setup.level ?? "standard";

  return {
    modeId,
    level,
    durationSec: setup.durationSec ?? 60,
    questionCount: setup.questionCount ?? 15,
    elementTypes: setup.elementTypes ?? ["color", "shape"],
    contentType: setup.contentType ?? "visual",
    showHints: setup.showHints ?? modeId === "pattern_learning",
    gaps: modeId === "pattern_multi" ? (setup.gaps ?? (level === "kids" ? 2 : 3)) : 1
  };
}

export function getPatternModeTitle(modeId: PatternModeId): string {
  return PATTERN_MODES.find(mode => mode.id === modeId)?.title ?? "Классический";
}

export function getPatternLevelTitle(level: PatternLevel): string {
  return PATTERN_LEVELS.find(item => item.id === level)?.title ?? "Standard";
}

export function getContentTypeTitle(id: PatternContentType): string {
  return CONTENT_TYPES.find(type => type.id === id)?.title ?? "Визуальные";
}

export function getPatternDifficultySummary(setup: Partial<PatternSetup>): string {
  const normalized = normalizePatternSetup(setup);

  if (normalized.modeId === "pattern_learning") {
    return "Один пропуск, явные подсказки по типу правила и мягкое введение новых семей.";
  }

  if (normalized.modeId === "pattern_multi") {
    return `${normalized.gaps ?? 2} пропуска подряд в конце ряда. Ответы заполняются строго по порядку.`;
  }

  if (normalized.modeId === "pattern_progressive") {
    return "Раунд стартует мягко, а затем в зависимости от серии может удерживать, повышать или смягчать ступень сложности.";
  }

  if (normalized.modeId === "pattern_timed") {
    return "Ставка на скорость: задачи остаются читабельными, но решения нужно принимать быстрее.";
  }

  if (normalized.level === "pro") {
    return "На уровне Pro ряды длиннее, distractors ближе, а в части режимов появляются multi-gap эпизоды.";
  }

  if (normalized.level === "kids") {
    return "Один пропуск, короткие ряды и базовые семейства без лишней перегрузки.";
  }

  return "Один пропуск, полноценный набор рабочих семейств и более плотные отвлекающие варианты.";
}

export type { PatternLevel, PatternModeId, PatternContentType };
