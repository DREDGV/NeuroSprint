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

function clampLevel(level: number): number {
  return Math.max(1, Math.min(10, Math.round(level)));
}

function levelToGridSize(level: number): GridSize {
  if (level <= 2) {
    return 3;
  }
  if (level <= 4) {
    return 4;
  }
  if (level <= 7) {
    return 5;
  }
  return 6;
}

function levelToPenalty(level: number): number {
  if (level <= 2) {
    return 0.25;
  }
  if (level <= 4) {
    return 0.35;
  }
  if (level <= 7) {
    return 0.5;
  }
  return 0.75;
}

function levelToTimeLimit(level: number, modeId: TrainingModeId): TimeLimitSec {
  if (modeId === "timed_plus") {
    if (level <= 4) {
      return 90;
    }
    if (level <= 7) {
      return 60;
    }
    return 45;
  }

  if (modeId === "reverse") {
    return level >= 8 ? 45 : 60;
  }

  return 60;
}

function levelToSpawnStrategy(level: number): SpawnStrategy {
  return level >= 9 ? "random_cell" : "same_cell";
}

function levelToShiftProfile(level: number): Pick<
  SchulteLevelDefaults,
  "shiftEnabled" | "shiftIntervalSec" | "shiftSwaps"
> {
  if (level <= 7) {
    return {
      shiftEnabled: false,
      shiftIntervalSec: 0,
      shiftSwaps: 0
    };
  }
  if (level === 8) {
    return {
      shiftEnabled: true,
      shiftIntervalSec: 7,
      shiftSwaps: 1
    };
  }
  if (level === 9) {
    return {
      shiftEnabled: true,
      shiftIntervalSec: 5,
      shiftSwaps: 1
    };
  }
  return {
    shiftEnabled: true,
    shiftIntervalSec: 4,
    shiftSwaps: 2
  };
}

export function getSchulteLevelDefaults(
  level: number,
  modeId: TrainingModeId
): SchulteLevelDefaults {
  const normalized = clampLevel(level);
  const shift = levelToShiftProfile(normalized);

  return {
    gridSize: levelToGridSize(normalized),
    errorPenalty: levelToPenalty(normalized),
    timeLimitSec: levelToTimeLimit(normalized, modeId),
    hintsEnabled: normalized <= 2,
    spawnStrategy: modeId === "timed_plus" ? levelToSpawnStrategy(normalized) : "same_cell",
    shiftEnabled: shift.shiftEnabled,
    shiftIntervalSec: shift.shiftIntervalSec,
    shiftSwaps: shift.shiftSwaps,
    timedBaseClear: modeId === "timed_plus" && normalized === 1
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
