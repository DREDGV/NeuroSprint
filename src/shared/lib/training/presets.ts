import type {
  GridSize,
  SchulteThemeId,
  TimeLimitSec,
  TrainingMode,
  TrainingModeId,
  TrainingModule,
  TrainingPresetId,
  TrainingSetup
} from "../../types/domain";
import {
  getSchulteLevelDefaults,
  withSchulteLevelDefaults
} from "../../../features/schulte/levelConfig";

export const TRAINING_MODULES: TrainingModule[] = [
  {
    id: "schulte",
    title: "Таблица Шульте",
    description: "Скорость поиска, внимание и темп обработки информации.",
    status: "active"
  },
  {
    id: "sprint_math",
    title: "Sprint Math",
    description: "Скоростной счет и вычисления.",
    status: "active"
  },
  {
    id: "reaction",
    title: "Reaction",
    description: "Тренировка скорости реакции на визуальные сигналы.",
    status: "active"
  },
  {
    id: "n_back",
    title: "N-Back Lite",
    description: "Короткая тренировка рабочей памяти 1-back/2-back.",
    status: "active"
  },
  {
    id: "memory_grid",
    title: "Memory Grid Rush",
    description: "Запомните последовательность и воспроизведите её.",
    status: "active"
  },
  {
    id: "decision_rush",
    title: "Decision Rush",
    description:
      "Быстрый тренажер правил ДА/НЕТ со сменой правил и фокусом на точность.",
    status: "active"
  }
];

export const SCHULTE_MODES: TrainingMode[] = [
  {
    id: "classic_plus",
    moduleId: "schulte",
    title: "Classic+",
    description: "Поиск чисел по порядку от 1 до N."
  },
  {
    id: "timed_plus",
    moduleId: "schulte",
    title: "Timed+",
    description: "Максимум правильных за ограниченное время."
  },
  {
    id: "reverse",
    moduleId: "schulte",
    title: "Reverse",
    description: "Поиск чисел в обратном порядке от N до 1."
  }
];

export const SPRINT_MATH_MODES: TrainingMode[] = [
  {
    id: "sprint_add_sub",
    moduleId: "sprint_math",
    title: "Sprint Add/Sub",
    description: "Быстрый режим на сложение и вычитание."
  },
  {
    id: "sprint_mixed",
    moduleId: "sprint_math",
    title: "Sprint Mixed",
    description: "Смешанные операции: +, -, * и /."
  }
];

export const REACTION_MODES: TrainingMode[] = [
  {
    id: "reaction_signal",
    moduleId: "reaction",
    title: "Reaction: Сигнал",
    description: "Быстрый отклик на визуальный сигнал."
  },
  {
    id: "reaction_stroop",
    moduleId: "reaction",
    title: "Reaction: Цвет и слово",
    description: "Найдите карточку, где цвет текста совпадает с надписью."
  },
  {
    id: "reaction_pair",
    moduleId: "reaction",
    title: "Reaction: Пара",
    description: "Найдите правильную пару по подсказке (символ + число)."
  },
  {
    id: "reaction_number",
    moduleId: "reaction",
    title: "Reaction: Число-цель",
    description: "Найдите и нажмите карточку с нужным числом в сетке 2x2."
  }
];

export const NBACK_MODES: TrainingMode[] = [
  {
    id: "nback_1",
    moduleId: "n_back",
    title: "N-Back Lite 1-back",
    description: "Жмите «Совпало», если клетка совпала с предыдущим шагом."
  },
  {
    id: "nback_1_4x4",
    moduleId: "n_back",
    title: "N-Back Lite 1-back 4×4",
    description: "Увеличенная сетка 4×4 для 1-back режима."
  },
  {
    id: "nback_2",
    moduleId: "n_back",
    title: "N-Back Lite 2-back",
    description: "Жмите «Совпало», если клетка совпала с позицией два шага назад."
  },
  {
    id: "nback_2_4x4",
    moduleId: "n_back",
    title: "N-Back Lite 2-back 4×4",
    description: "Увеличенная сетка 4×4 для 2-back режима."
  },
  {
    id: "nback_3",
    moduleId: "n_back",
    title: "N-Back Lite 3-back",
    description: "Хардкор: сравнивайте с позицией 3 шага назад."
  }
];

export const MEMORY_GRID_MODES: TrainingMode[] = [
  {
    id: "memory_grid_classic",
    moduleId: "memory_grid",
    title: "Memory Grid Classic",
    description: "Запомните последовательность и воспроизведите её. Ошибка = конец игры."
  },
  {
    id: "memory_grid_classic_4x4",
    moduleId: "memory_grid",
    title: "Memory Grid Classic 4×4",
    description: "Увеличенная сетка 4×4 для классического режима."
  },
  {
    id: "memory_grid_rush",
    moduleId: "memory_grid",
    title: "Memory Grid Rush",
    description: "60 секунд на прохождение максимального количества уровней."
  },
  {
    id: "memory_grid_rush_4x4",
    moduleId: "memory_grid",
    title: "Memory Grid Rush 4×4",
    description: "Увеличенная сетка 4×4 для режима Rush."
  }
];

export const DECISION_RUSH_MODES: TrainingMode[] = [
  {
    id: "decision_kids",
    moduleId: "decision_rush",
    title: "Decision Rush Kids",
    description: "Мягкий темп: правила по цвету и форме без отрицаний."
  },
  {
    id: "decision_standard",
    moduleId: "decision_rush",
    title: "Decision Rush Standard",
    description: "Базовый поток: цвет, форма, число и короткий boss-раунд."
  },
  {
    id: "decision_pro",
    moduleId: "decision_rush",
    title: "Decision Rush Pro",
    description: "Ускоренный поток с отрицаниями и более плотным темпом."
  }
];

export const TRAINING_MODES: TrainingMode[] = [
  ...SCHULTE_MODES,
  ...SPRINT_MATH_MODES,
  ...REACTION_MODES,
  ...NBACK_MODES,
  ...MEMORY_GRID_MODES,
  ...DECISION_RUSH_MODES
];

const PRESET_MAP: Record<TrainingPresetId, TrainingSetup> = {
  easy: {
    presetId: "easy",
    gridSize: 3,
    timeLimitSec: 60,
    errorPenalty: 0.25,
    hintsEnabled: true,
    spawnStrategy: "same_cell",
    visualThemeId: "classic_bw",
    customTheme: null,
    autoAdjust: true,
    manualLevel: null,
    shiftEnabled: false,
    shiftIntervalSec: 0,
    shiftSwaps: 0,
    timedBaseClear: true
  },
  standard: {
    presetId: "standard",
    gridSize: 5,
    timeLimitSec: 60,
    errorPenalty: 0.5,
    hintsEnabled: false,
    spawnStrategy: "same_cell",
    visualThemeId: "classic_bw",
    customTheme: null,
    autoAdjust: true,
    manualLevel: null,
    shiftEnabled: false,
    shiftIntervalSec: 0,
    shiftSwaps: 0,
    timedBaseClear: false
  },
  intense: {
    presetId: "intense",
    gridSize: 6,
    timeLimitSec: 45,
    errorPenalty: 0.75,
    hintsEnabled: false,
    spawnStrategy: "random_cell",
    visualThemeId: "classic_bw",
    customTheme: null,
    autoAdjust: true,
    manualLevel: null,
    shiftEnabled: true,
    shiftIntervalSec: 5,
    shiftSwaps: 1,
    timedBaseClear: false
  },
  legacy: {
    presetId: "legacy",
    gridSize: 5,
    timeLimitSec: 60,
    errorPenalty: 0.5,
    hintsEnabled: false,
    spawnStrategy: "same_cell",
    visualThemeId: "classic_bw",
    customTheme: null,
    autoAdjust: true,
    manualLevel: null,
    shiftEnabled: false,
    shiftIntervalSec: 0,
    shiftSwaps: 0,
    timedBaseClear: false
  }
};

export function getPresetSetup(presetId: TrainingPresetId): TrainingSetup {
  return { ...PRESET_MAP[presetId] };
}

export function mapLevelToDefaults(
  level: number,
  modeId: TrainingModeId
): Pick<
  TrainingSetup,
  | "gridSize"
  | "errorPenalty"
  | "timeLimitSec"
  | "hintsEnabled"
  | "spawnStrategy"
  | "shiftEnabled"
  | "shiftIntervalSec"
  | "shiftSwaps"
  | "timedBaseClear"
> {
  return getSchulteLevelDefaults(level, modeId);
}

export function withLevelDefaults(
  setup: TrainingSetup,
  level: number,
  modeId: TrainingModeId
): TrainingSetup {
  return withSchulteLevelDefaults(setup, level, modeId);
}

export function gridSizeToNumbersCount(gridSize: GridSize): number {
  return gridSize * gridSize;
}

export function normalizeThemeId(value: string | undefined): SchulteThemeId {
  if (
    value === "classic_bw" ||
    value === "contrast" ||
    value === "soft" ||
    value === "rainbow" ||
    value === "kid_candy" ||
    value === "kid_ocean" ||
    value === "kid_space" ||
    value === "kid_comics"
  ) {
    return value;
  }
  return "classic_bw";
}

export function normalizeTimeLimit(value: number): TimeLimitSec {
  if (value === 30 || value === 45 || value === 60 || value === 90) {
    return value;
  }
  return 60;
}
