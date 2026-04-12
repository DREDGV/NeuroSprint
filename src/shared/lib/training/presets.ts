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
    description: "Классический тренажёр для развития периферического зрения, скорости поиска и концентрации. Поочерёдный поиск чисел от 1 до N тренирует внимательность и темп обработки визуальной информации.",
    status: "active"
  },
  {
    id: "sprint_math",
    title: "Математический спринт",
    description: "Скоростные вычисления на сложение, вычитание, умножение и деление. Развивает быстроту устного счёта, рабочую память и уверенность в математических операциях.",
    status: "active"
  },
  {
    id: "reaction",
    title: "Реакция",
    description: "Тренировка скорости реакции на визуальные сигналы. Учит быстро распознавать стимулы и мгновенно реагировать, что полезно в спорте, вождении и повседневной жизни.",
    status: "active"
  },
  {
    id: "n_back",
    title: "N-Назад",
    description: "Научно обоснованный тренажёр рабочей памяти. Запоминание позиций с задержкой в N шагов развивает способность удерживать и обновлять информацию в уме.",
    status: "active"
  },
  {
    id: "memory_grid",
    title: "Сетка памяти",
    description: "Запоминание и воспроизведение последовательности ячеек на сетке. Тренирует зрительную память, порядок воспроизведения и точность запоминания паттернов.",
    status: "active"
  },
  {
    id: "memory_match",
    title: "Пары памяти",
    description: "Классическая игра на поиск пар карточек. Развивает зрительную память, удержание позиций на поле и стратегию запоминания без повторных ошибок.",
    status: "active"
  },
  {
    id: "spatial_memory",
    title: "Пространственная память",
    description: "Запоминание расположения зон и форм на поле. Тренирует способность удерживать пространственную карту, работать с зонами и опорными точками.",
    status: "active"
  },
  {
    id: "decision_rush",
    title: "Быстрые решения",
    description: "Скоростной тренажёр на переключение между правилами. Развивает гибкость мышления, точность решений и способность быстро адаптироваться к меняющимся условиям.",
    status: "active"
  },
  {
    id: "pattern_recognition",
    title: "Распознавание паттернов",
    description: "Поиск закономерностей в последовательностях. Тренирует логическое мышление, способность видеть паттерны и предсказывать следующие элементы.",
    status: "active"
  }
];

export const SCHULTE_MODES: TrainingMode[] = [
  {
    id: "classic_plus",
    moduleId: "schulte",
    title: "Классика+",
    description: "Поиск чисел по порядку от 1 до N."
  },
  {
    id: "timed_plus",
    moduleId: "schulte",
    title: "На время+",
    description: "Максимум правильных чисел за ограниченное время."
  },
  {
    id: "reverse",
    moduleId: "schulte",
    title: "Обратный",
    description: "Поиск чисел в обратном порядке от N до 1."
  }
];

export const SPRINT_MATH_MODES: TrainingMode[] = [
  {
    id: "sprint_add_sub",
    moduleId: "sprint_math",
    title: "Сложение/вычитание",
    description: "Быстрый режим на сложение и вычитание."
  },
  {
    id: "sprint_mixed",
    moduleId: "sprint_math",
    title: "Смешанный",
    description: "Смешанные операции: +, -, * и /."
  }
];

export const REACTION_MODES: TrainingMode[] = [
  {
    id: "reaction_signal",
    moduleId: "reaction",
    title: "Реакция: Сигнал",
    description: "Быстрый отклик на визуальный сигнал."
  },
  {
    id: "reaction_stroop",
    moduleId: "reaction",
    title: "Реакция: Цвет и слово",
    description: "Найдите карточку, где цвет текста совпадает с надписью."
  },
  {
    id: "reaction_pair",
    moduleId: "reaction",
    title: "Реакция: Пара",
    description: "Найдите правильную пару по подсказке: символ и число."
  },
  {
    id: "reaction_number",
    moduleId: "reaction",
    title: "Реакция: Число-цель",
    description: "Найдите и нажмите карточку с нужным числом в сетке 2x2."
  }
];

export const NBACK_MODES: TrainingMode[] = [
  {
    id: "nback_1",
    moduleId: "n_back",
    title: "N-Назад 1",
    description: "Жмите «Совпало», если клетка совпала с предыдущим шагом."
  },
  {
    id: "nback_1_4x4",
    moduleId: "n_back",
    title: "N-Назад 1 4x4",
    description: "Увеличенная сетка 4x4 для режима 1-back."
  },
  {
    id: "nback_2",
    moduleId: "n_back",
    title: "N-Назад 2",
    description: "Жмите «Совпало», если клетка совпала с позицией два шага назад."
  },
  {
    id: "nback_2_4x4",
    moduleId: "n_back",
    title: "N-Назад 2 4x4",
    description: "Увеличенная сетка 4x4 для режима 2-back."
  },
  {
    id: "nback_3",
    moduleId: "n_back",
    title: "N-Назад 3",
    description: "Сравнивайте текущую клетку с позицией три шага назад."
  }
];

export const MEMORY_GRID_MODES: TrainingMode[] = [
  {
    id: "memory_grid_classic",
    moduleId: "memory_grid",
    title: "Сетка памяти: Классика",
    description: "Запомните последовательность и воспроизведите её. Ошибка завершает попытку."
  },
  {
    id: "memory_grid_classic_kids",
    moduleId: "memory_grid",
    title: "Сетка памяти: Дети",
    description: "Мягкий режим для детей 6-10 лет: медленнее темп и проще уровни."
  },
  {
    id: "memory_grid_classic_pro",
    moduleId: "memory_grid",
    title: "Сетка памяти: Про",
    description: "Сложный режим для взрослых: быстрее темп и сетка 4x4."
  },
  {
    id: "memory_grid_classic_4x4",
    moduleId: "memory_grid",
    title: "Сетка памяти: Классика 4x4",
    description: "Увеличенная сетка 4x4 для классического режима."
  },
  {
    id: "memory_grid_rush",
    moduleId: "memory_grid",
    title: "Сетка памяти: На скорость",
    description: "60 секунд на прохождение максимального количества уровней."
  },
  {
    id: "memory_grid_rush_kids",
    moduleId: "memory_grid",
    title: "Сетка памяти: На скорость Дети",
    description: "Мягкий режим на время для детей."
  },
  {
    id: "memory_grid_rush_pro",
    moduleId: "memory_grid",
    title: "Сетка памяти: На скорость Про",
    description: "Быстрый режим на время для опытных пользователей."
  },
  {
    id: "memory_grid_rush_4x4",
    moduleId: "memory_grid",
    title: "Сетка памяти: На скорость 4x4",
    description: "Увеличенная сетка 4x4 для режима на скорость."
  }
];

export const DECISION_RUSH_MODES: TrainingMode[] = [
  {
    id: "decision_kids",
    moduleId: "decision_rush",
    title: "Быстрые решения: Дети",
    description: "Мягкий темп: правила по цвету и форме без отрицаний."
  },
  {
    id: "decision_standard",
    moduleId: "decision_rush",
    title: "Быстрые решения: Стандарт",
    description: "Базовый поток: цвет, форма, число и короткий boss-раунд."
  },
  {
    id: "decision_pro",
    moduleId: "decision_rush",
    title: "Быстрые решения: Про",
    description: "Ускоренный поток с отрицаниями и более плотным темпом."
  }
];

export const MEMORY_MATCH_MODES: TrainingMode[] = [
  {
    id: "memory_match_classic",
    moduleId: "memory_match",
    title: "Пары памяти: Классика",
    description: "Запомните поле, находите пары и старайтесь не повторять одни и те же ошибки."
  }
];

export const SPATIAL_MEMORY_MODES: TrainingMode[] = [
  {
    id: "spatial_memory_classic",
    moduleId: "spatial_memory",
    title: "Spatial Memory Classic",
    description: "Запомните карту поля, удержите форму и восстановите её без лишних догадок."
  }
];

export const PATTERN_MODES: TrainingMode[] = [
  {
    id: "pattern_classic",
    moduleId: "pattern_recognition",
    title: "Распознавание паттернов: Классика",
    description: "Фиксированная серия заданий на поиск закономерностей."
  },
  {
    id: "pattern_timed",
    moduleId: "pattern_recognition",
    title: "Распознавание паттернов: На время",
    description: "Как можно больше правильных ответов за ограниченное время."
  },
  {
    id: "pattern_progressive",
    moduleId: "pattern_recognition",
    title: "Распознавание паттернов: Прогрессивный",
    description: "Адаптивная сложность: уровень меняется по ходу сессии."
  },
  {
    id: "pattern_learning",
    moduleId: "pattern_recognition",
    title: "Распознавание паттернов: Обучение",
    description: "Режим обучения с подсказками и разбором ответа."
  }
];

export const TRAINING_MODES: TrainingMode[] = [
  ...SCHULTE_MODES,
  ...SPRINT_MATH_MODES,
  ...REACTION_MODES,
  ...NBACK_MODES,
  ...MEMORY_GRID_MODES,
  ...DECISION_RUSH_MODES,
  ...MEMORY_MATCH_MODES,
  ...SPATIAL_MEMORY_MODES,
  ...PATTERN_MODES
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

