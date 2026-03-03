import type { TrainingModeId, TrainingModuleId } from "../../types/domain";

const SPRINT_MODE_IDS: TrainingModeId[] = ["sprint_add_sub", "sprint_mixed"];
const REACTION_MODE_IDS: TrainingModeId[] = [
  "reaction_signal",
  "reaction_stroop",
  "reaction_pair",
  "reaction_number"
];
const NBACK_MODE_IDS: TrainingModeId[] = [
  "nback_1",
  "nback_1_4x4",
  "nback_2",
  "nback_2_4x4",
  "nback_3"
];
const MEMORY_GRID_MODE_IDS: TrainingModeId[] = [
  "memory_grid_classic",
  "memory_grid_classic_4x4",
  "memory_grid_rush",
  "memory_grid_rush_4x4"
];
const DECISION_RUSH_MODE_IDS: TrainingModeId[] = [
  "decision_kids",
  "decision_standard",
  "decision_pro"
];
const PATTERN_MODE_IDS: TrainingModeId[] = [
  "pattern_classic",
  "pattern_timed",
  "pattern_progressive",
  "pattern_learning",
  "pattern_multi"
];

export function moduleIdByModeId(modeId: TrainingModeId): TrainingModuleId {
  if (SPRINT_MODE_IDS.includes(modeId)) {
    return "sprint_math";
  }
  if (REACTION_MODE_IDS.includes(modeId)) {
    return "reaction";
  }
  if (NBACK_MODE_IDS.includes(modeId)) {
    return "n_back";
  }
  if (MEMORY_GRID_MODE_IDS.includes(modeId)) {
    return "memory_grid";
  }
  if (DECISION_RUSH_MODE_IDS.includes(modeId)) {
    return "decision_rush";
  }
  if (PATTERN_MODE_IDS.includes(modeId)) {
    return "pattern_recognition";
  }
  return "schulte";
}

export function isSprintMathMode(modeId: TrainingModeId): boolean {
  return SPRINT_MODE_IDS.includes(modeId);
}

export function isReactionMode(modeId: TrainingModeId): boolean {
  return REACTION_MODE_IDS.includes(modeId);
}

export function isNBackMode(modeId: TrainingModeId): boolean {
  return NBACK_MODE_IDS.includes(modeId);
}

export function isMemoryGridMode(modeId: TrainingModeId): boolean {
  return MEMORY_GRID_MODE_IDS.includes(modeId);
}

export function isDecisionRushMode(modeId: TrainingModeId): boolean {
  return DECISION_RUSH_MODE_IDS.includes(modeId);
}

export function isPatternMode(modeId: TrainingModeId): boolean {
  return PATTERN_MODE_IDS.includes(modeId);
}

export function isTimedMode(modeId: TrainingModeId): boolean {
  return modeId === "timed_plus";
}
