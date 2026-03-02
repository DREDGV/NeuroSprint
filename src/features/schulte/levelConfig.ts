import type {
  GridSize,
  SpawnStrategy,
  TimeLimitSec,
  TrainingModeId,
  TrainingSetup
} from "../../shared/types/domain";

export interface SchulteLevelDefaults {
  gridSize: GridSize;
  errorPenalty: number;
  timeLimitSec: TimeLimitSec;
  hintsEnabled: boolean;
  spawnStrategy: SpawnStrategy;
  shiftEnabled: boolean;
  shiftIntervalSec: number;
  shiftSwaps: number;
  timedBaseClear: boolean;
}

interface LevelMatrixEntry {
  gridSize: GridSize;
  errorPenalty: number;
  hintsEnabled: boolean;
  timedLimitSec: TimeLimitSec;
  reverseLimitSec: TimeLimitSec;
  spawnStrategy: SpawnStrategy;
  shiftEnabled: boolean;
  shiftIntervalSec: number;
  shiftSwaps: number;
  timedBaseClear: boolean;
}

function clampLevel(level: number): number {
  return Math.max(1, Math.min(10, Math.round(level)));
}

const LEVEL_MATRIX: Record<number, LevelMatrixEntry> = {
  1: {
    gridSize: 3,
    errorPenalty: 0.2,
    hintsEnabled: true,
    timedLimitSec: 90,
    reverseLimitSec: 60,
    spawnStrategy: "same_cell",
    shiftEnabled: false,
    shiftIntervalSec: 0,
    shiftSwaps: 0,
    timedBaseClear: true
  },
  2: {
    gridSize: 3,
    errorPenalty: 0.25,
    hintsEnabled: true,
    timedLimitSec: 90,
    reverseLimitSec: 60,
    spawnStrategy: "same_cell",
    shiftEnabled: false,
    shiftIntervalSec: 0,
    shiftSwaps: 0,
    timedBaseClear: false
  },
  3: {
    gridSize: 4,
    errorPenalty: 0.3,
    hintsEnabled: true,
    timedLimitSec: 90,
    reverseLimitSec: 60,
    spawnStrategy: "same_cell",
    shiftEnabled: false,
    shiftIntervalSec: 0,
    shiftSwaps: 0,
    timedBaseClear: false
  },
  4: {
    gridSize: 4,
    errorPenalty: 0.35,
    hintsEnabled: false,
    timedLimitSec: 90,
    reverseLimitSec: 60,
    spawnStrategy: "same_cell",
    shiftEnabled: false,
    shiftIntervalSec: 0,
    shiftSwaps: 0,
    timedBaseClear: false
  },
  5: {
    gridSize: 5,
    errorPenalty: 0.45,
    hintsEnabled: false,
    timedLimitSec: 60,
    reverseLimitSec: 60,
    spawnStrategy: "same_cell",
    shiftEnabled: false,
    shiftIntervalSec: 0,
    shiftSwaps: 0,
    timedBaseClear: false
  },
  6: {
    gridSize: 5,
    errorPenalty: 0.5,
    hintsEnabled: false,
    timedLimitSec: 60,
    reverseLimitSec: 60,
    spawnStrategy: "same_cell",
    shiftEnabled: false,
    shiftIntervalSec: 0,
    shiftSwaps: 0,
    timedBaseClear: false
  },
  7: {
    gridSize: 5,
    errorPenalty: 0.55,
    hintsEnabled: false,
    timedLimitSec: 45,
    reverseLimitSec: 60,
    spawnStrategy: "random_cell",
    shiftEnabled: false,
    shiftIntervalSec: 0,
    shiftSwaps: 0,
    timedBaseClear: false
  },
  8: {
    gridSize: 6,
    errorPenalty: 0.65,
    hintsEnabled: false,
    timedLimitSec: 45,
    reverseLimitSec: 45,
    spawnStrategy: "random_cell",
    shiftEnabled: true,
    shiftIntervalSec: 7,
    shiftSwaps: 1,
    timedBaseClear: false
  },
  9: {
    gridSize: 6,
    errorPenalty: 0.75,
    hintsEnabled: false,
    timedLimitSec: 45,
    reverseLimitSec: 45,
    spawnStrategy: "random_cell",
    shiftEnabled: true,
    shiftIntervalSec: 5,
    shiftSwaps: 1,
    timedBaseClear: false
  },
  10: {
    gridSize: 6,
    errorPenalty: 0.85,
    hintsEnabled: false,
    timedLimitSec: 30,
    reverseLimitSec: 45,
    spawnStrategy: "random_cell",
    shiftEnabled: true,
    shiftIntervalSec: 4,
    shiftSwaps: 2,
    timedBaseClear: false
  }
};

export function getSchulteLevelDefaults(
  level: number,
  modeId: TrainingModeId
): SchulteLevelDefaults {
  const normalized = clampLevel(level);
  const profile = LEVEL_MATRIX[normalized] ?? LEVEL_MATRIX[1];

  const timeLimitSec =
    modeId === "timed_plus"
      ? profile.timedLimitSec
      : modeId === "reverse"
        ? profile.reverseLimitSec
        : 60;

  return {
    gridSize: profile.gridSize,
    errorPenalty: profile.errorPenalty,
    timeLimitSec,
    hintsEnabled: profile.hintsEnabled,
    spawnStrategy: modeId === "timed_plus" ? profile.spawnStrategy : "same_cell",
    shiftEnabled: profile.shiftEnabled,
    shiftIntervalSec: profile.shiftIntervalSec,
    shiftSwaps: profile.shiftSwaps,
    timedBaseClear: modeId === "timed_plus" ? profile.timedBaseClear : false
  };
}

export function withSchulteLevelDefaults(
  setup: TrainingSetup,
  level: number,
  modeId: TrainingModeId
): TrainingSetup {
  const defaults = getSchulteLevelDefaults(level, modeId);
  return {
    ...setup,
    gridSize: defaults.gridSize,
    errorPenalty: defaults.errorPenalty,
    timeLimitSec: defaults.timeLimitSec,
    hintsEnabled: defaults.hintsEnabled,
    spawnStrategy: defaults.spawnStrategy,
    shiftEnabled: defaults.shiftEnabled,
    shiftIntervalSec: defaults.shiftIntervalSec,
    shiftSwaps: defaults.shiftSwaps,
    timedBaseClear: defaults.timedBaseClear
  };
}

export function getTargetSpeedPerMinute(
  modeId: TrainingModeId,
  gridSize: GridSize
): number {
  if (modeId === "timed_plus") {
    if (gridSize === 3) {
      return 16;
    }
    if (gridSize === 4) {
      return 20;
    }
    if (gridSize === 5) {
      return 25;
    }
    return 30;
  }

  if (modeId === "reverse") {
    if (gridSize === 3) {
      return 14;
    }
    if (gridSize === 4) {
      return 18;
    }
    if (gridSize === 5) {
      return 22;
    }
    return 27;
  }

  if (gridSize === 3) {
    return 15;
  }
  if (gridSize === 4) {
    return 19;
  }
  if (gridSize === 5) {
    return 24;
  }
  return 29;
}

