import { TRAINING_SETUPS_KEY } from "../../constants/storage";
import { getPresetSetup, normalizeThemeId } from "./presets";
import type {
  GridSize,
  SchulteThemeConfig,
  TrainingModeId,
  TrainingPresetId,
  TrainingSetup
} from "../../types/domain";

type TrainingSetupsMap = Partial<Record<TrainingModeId, TrainingSetup>>;

function safeParse(raw: string | null): TrainingSetupsMap {
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as TrainingSetupsMap;
  } catch {
    return {};
  }
}

function normalizeGridSize(value: unknown): GridSize {
  return value === 3 || value === 4 || value === 5 || value === 6 ? value : 5;
}

function normalizeSetup(
  modeId: TrainingModeId,
  setup: Partial<TrainingSetup> | undefined
): TrainingSetup {
  const fallback = getPresetSetup("standard");
  if (!setup) {
    return fallback;
  }

  return {
    presetId: setup.presetId ?? fallback.presetId,
    gridSize: normalizeGridSize(setup.gridSize),
    timeLimitSec:
      setup.timeLimitSec === 30 ||
      setup.timeLimitSec === 45 ||
      setup.timeLimitSec === 60 ||
      setup.timeLimitSec === 90
        ? setup.timeLimitSec
        : fallback.timeLimitSec,
    errorPenalty:
      typeof setup.errorPenalty === "number" && Number.isFinite(setup.errorPenalty)
        ? Math.max(0, setup.errorPenalty)
        : fallback.errorPenalty,
    hintsEnabled:
      typeof setup.hintsEnabled === "boolean" ? setup.hintsEnabled : fallback.hintsEnabled,
    spawnStrategy:
      setup.spawnStrategy === "random_cell" ? "random_cell" : "same_cell",
    visualThemeId: normalizeThemeId(setup.visualThemeId),
    customTheme: (setup.customTheme as Partial<SchulteThemeConfig> | null) ?? null,
    autoAdjust: typeof setup.autoAdjust === "boolean" ? setup.autoAdjust : true,
    manualLevel:
      typeof setup.manualLevel === "number" && Number.isFinite(setup.manualLevel)
        ? Math.max(1, Math.min(10, Math.round(setup.manualLevel)))
        : null
  };
}

export function getTrainingSetup(modeId: TrainingModeId): TrainingSetup {
  const map = safeParse(localStorage.getItem(TRAINING_SETUPS_KEY));
  const setup = map[modeId] as Partial<TrainingSetup> | undefined;
  return normalizeSetup(modeId, setup);
}

export function saveTrainingSetup(modeId: TrainingModeId, setup: TrainingSetup): void {
  const map = safeParse(localStorage.getItem(TRAINING_SETUPS_KEY));
  map[modeId] = setup;
  localStorage.setItem(TRAINING_SETUPS_KEY, JSON.stringify(map));
}

export function resetTrainingSetupToPreset(
  modeId: TrainingModeId,
  presetId: TrainingPresetId
): TrainingSetup {
  const setup = getPresetSetup(presetId);
  saveTrainingSetup(modeId, setup);
  return setup;
}
