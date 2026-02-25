import { SPRINT_MATH_SETUP_KEY } from "../../shared/constants/storage";
import {
  DEFAULT_SPRINT_MATH_SETUP,
  normalizeSprintMathSetup,
  type SprintMathSetup
} from "./contract";

function safeParse(raw: string | null): Partial<SprintMathSetup> | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Partial<SprintMathSetup>;
  } catch {
    return null;
  }
}

export function getSprintMathSetup(): SprintMathSetup {
  return normalizeSprintMathSetup(safeParse(localStorage.getItem(SPRINT_MATH_SETUP_KEY)));
}

export function saveSprintMathSetup(setup: SprintMathSetup): void {
  localStorage.setItem(SPRINT_MATH_SETUP_KEY, JSON.stringify(normalizeSprintMathSetup(setup)));
}

export function resetSprintMathSetup(): SprintMathSetup {
  const setup = { ...DEFAULT_SPRINT_MATH_SETUP };
  saveSprintMathSetup(setup);
  return setup;
}
