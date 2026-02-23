import { TRAINING_SETUPS_KEY } from "../../constants/storage";
import { getPresetSetup } from "./presets";
import type {
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

export function getTrainingSetup(modeId: TrainingModeId): TrainingSetup {
  const map = safeParse(localStorage.getItem(TRAINING_SETUPS_KEY));
  const setup = map[modeId];
  if (!setup) {
    return getPresetSetup("standard");
  }
  return setup;
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

