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

export const TRAINING_MODULES: TrainingModule[] = [
  {
    id: "schulte",
    title: "Таблица Шульте",
    description: "Скорость поиска, внимание, темп обработки информации.",
    status: "active"
  },
  {
    id: "sprint_math",
    title: "Sprint Math",
    description: "Скоростной счет и вычисления.",
    status: "active"
  },
  {
    id: "n_back",
    title: "N-back",
    description: "Тренировка рабочей памяти.",
    status: "coming_soon"
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
    description: "Р‘С‹СЃС‚СЂС‹Р№ СЂРµР¶РёРј РЅР° СЃР»РѕР¶РµРЅРёРµ Рё РІС‹С‡РёС‚Р°РЅРёРµ."
  },
  {
    id: "sprint_mixed",
    moduleId: "sprint_math",
    title: "Sprint Mixed",
    description: "РЎРјРµС€Р°РЅРЅС‹Рµ РѕРїРµСЂР°С†РёРё: +, -, * и /."
  }
];

export const TRAINING_MODES: TrainingMode[] = [...SCHULTE_MODES, ...SPRINT_MATH_MODES];

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
    manualLevel: null
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
    manualLevel: null
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
    manualLevel: null
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
    manualLevel: null
  }
};

export function getPresetSetup(presetId: TrainingPresetId): TrainingSetup {
  return { ...PRESET_MAP[presetId] };
}

export function mapLevelToDefaults(
  level: number,
  modeId: TrainingModeId
): Pick<TrainingSetup, "gridSize" | "errorPenalty" | "timeLimitSec"> {
  const clampedLevel = Math.max(1, Math.min(10, Math.round(level)));

  if (clampedLevel <= 2) {
    return {
      gridSize: 3,
      errorPenalty: 0.25,
      timeLimitSec: 90
    };
  }

  if (clampedLevel <= 4) {
    return {
      gridSize: 4,
      errorPenalty: 0.35,
      timeLimitSec: 60
    };
  }

  if (clampedLevel <= 7) {
    return {
      gridSize: 5,
      errorPenalty: 0.5,
      timeLimitSec: 60
    };
  }

  return {
    gridSize: 6,
    errorPenalty: 0.75,
    timeLimitSec: modeId === "reverse" ? 45 : 45
  };
}

export function withLevelDefaults(
  setup: TrainingSetup,
  level: number,
  modeId: TrainingModeId
): TrainingSetup {
  const defaults = mapLevelToDefaults(level, modeId);
  return {
    ...setup,
    gridSize: defaults.gridSize,
    errorPenalty: defaults.errorPenalty,
    timeLimitSec: defaults.timeLimitSec
  };
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
