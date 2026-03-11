import type { TrainingModeId, TrainingModuleId } from "../../shared/types/domain";

const TRAINER_FEEDBACK_KEY = "ns.trainerFeedback.v1";
const TRAINER_FEEDBACK_HANDLED_PREFIX = "ns.trainerFeedbackHandled";

export type TrainerFeedbackSentiment = "liked" | "okay" | "not_for_me";

export interface TrainerFeedbackEntry {
  id: string;
  userId: string;
  moduleId: TrainingModuleId;
  modeId?: TrainingModeId;
  sentiment: TrainerFeedbackSentiment;
  reasons: string[];
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

function safeParse(raw: string | null): TrainerFeedbackEntry[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TrainerFeedbackEntry[]) : [];
  } catch {
    return [];
  }
}

function readAll(): TrainerFeedbackEntry[] {
  return safeParse(localStorage.getItem(TRAINER_FEEDBACK_KEY));
}

function writeAll(entries: TrainerFeedbackEntry[]): void {
  localStorage.setItem(TRAINER_FEEDBACK_KEY, JSON.stringify(entries));
}

export function getTrainerFeedbackHandledKey(
  userId: string,
  moduleId: TrainingModuleId,
  localDate: string
): string {
  return `${TRAINER_FEEDBACK_HANDLED_PREFIX}:${userId}:${moduleId}:${localDate}`;
}

export function hasTrainerFeedbackBeenHandled(
  userId: string,
  moduleId: TrainingModuleId,
  localDate: string
): boolean {
  return localStorage.getItem(getTrainerFeedbackHandledKey(userId, moduleId, localDate)) === "1";
}

export function markTrainerFeedbackHandled(
  userId: string,
  moduleId: TrainingModuleId,
  localDate: string
): void {
  localStorage.setItem(getTrainerFeedbackHandledKey(userId, moduleId, localDate), "1");
}

export function saveTrainerFeedback(entry: Omit<TrainerFeedbackEntry, "id" | "createdAt" | "updatedAt">): TrainerFeedbackEntry {
  const now = new Date().toISOString();
  const storedEntry: TrainerFeedbackEntry = {
    ...entry,
    id: `${entry.userId}:${entry.moduleId}:${Date.now()}`,
    createdAt: now,
    updatedAt: now
  };

  const all = readAll();
  writeAll([storedEntry, ...all]);
  return storedEntry;
}

export function listTrainerFeedbackByUser(userId: string): TrainerFeedbackEntry[] {
  return readAll().filter((entry) => entry.userId === userId);
}
