import {
  normalizeDecisionRushSetup,
  type DecisionRushSetup
} from "./engine";

const KEY = "ns.decisionRushSetup";

export function getDecisionRushSetup(): DecisionRushSetup {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    return normalizeDecisionRushSetup(undefined);
  }

  try {
    return normalizeDecisionRushSetup(JSON.parse(raw) as Partial<DecisionRushSetup>);
  } catch {
    return normalizeDecisionRushSetup(undefined);
  }
}

export function saveDecisionRushSetup(setup: DecisionRushSetup): void {
  localStorage.setItem(KEY, JSON.stringify(normalizeDecisionRushSetup(setup)));
}

export function resetDecisionRushSetup(): DecisionRushSetup {
  const defaults = normalizeDecisionRushSetup(undefined);
  saveDecisionRushSetup(defaults);
  return defaults;
}
