import { normalizeNBackSetup, type NBackSetup } from "./engine";

const NBACK_SETUP_KEY = "ns.nbackSetup";

export function getNBackSetup(): NBackSetup {
  try {
    const raw = localStorage.getItem(NBACK_SETUP_KEY);
    if (!raw) {
      return normalizeNBackSetup(null);
    }
    return normalizeNBackSetup(JSON.parse(raw) as Partial<NBackSetup>);
  } catch {
    return normalizeNBackSetup(null);
  }
}

export function saveNBackSetup(setup: NBackSetup): void {
  localStorage.setItem(NBACK_SETUP_KEY, JSON.stringify(normalizeNBackSetup(setup)));
}

export function resetNBackSetup(): NBackSetup {
  const setup = normalizeNBackSetup(null);
  saveNBackSetup(setup);
  return setup;
}
