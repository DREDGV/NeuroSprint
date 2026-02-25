import type { TrainingModeId, TrainingModuleId } from "../../types/domain";

const SPRINT_MODE_IDS: TrainingModeId[] = ["sprint_add_sub", "sprint_mixed"];

export function moduleIdByModeId(modeId: TrainingModeId): TrainingModuleId {
  return SPRINT_MODE_IDS.includes(modeId) ? "sprint_math" : "schulte";
}

export function isSprintMathMode(modeId: TrainingModeId): boolean {
  return SPRINT_MODE_IDS.includes(modeId);
}

export function isTimedMode(modeId: TrainingModeId): boolean {
  return modeId === "timed_plus";
}
