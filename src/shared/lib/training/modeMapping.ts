import type { TrainingModeId, TrainingModuleId } from "../../types/domain";

const SPRINT_MODE_IDS: TrainingModeId[] = ["sprint_add_sub", "sprint_mixed"];
const REACTION_MODE_IDS: TrainingModeId[] = [
  "reaction_signal",
  "reaction_stroop",
  "reaction_pair"
];

export function moduleIdByModeId(modeId: TrainingModeId): TrainingModuleId {
  if (SPRINT_MODE_IDS.includes(modeId)) {
    return "sprint_math";
  }
  if (REACTION_MODE_IDS.includes(modeId)) {
    return "reaction";
  }
  return "schulte";
}

export function isSprintMathMode(modeId: TrainingModeId): boolean {
  return SPRINT_MODE_IDS.includes(modeId);
}

export function isReactionMode(modeId: TrainingModeId): boolean {
  return REACTION_MODE_IDS.includes(modeId);
}

export function isTimedMode(modeId: TrainingModeId): boolean {
  return modeId === "timed_plus";
}
