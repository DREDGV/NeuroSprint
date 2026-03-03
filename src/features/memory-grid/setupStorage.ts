import { normalizeMemoryGridSetup, type MemoryGridSetup } from "./engine";

const MEMORY_GRID_SETUP_KEY = "ns.memoryGridSetup";

export function getMemoryGridSetup(): MemoryGridSetup {
  try {
    const raw = localStorage.getItem(MEMORY_GRID_SETUP_KEY);
    if (!raw) {
      return normalizeMemoryGridSetup({ difficulty: "standard" });
    }
    return normalizeMemoryGridSetup(JSON.parse(raw) as Partial<MemoryGridSetup>);
  } catch {
    return normalizeMemoryGridSetup({ difficulty: "standard" });
  }
}

export function saveMemoryGridSetup(setup: MemoryGridSetup): void {
  localStorage.setItem(MEMORY_GRID_SETUP_KEY, JSON.stringify(normalizeMemoryGridSetup(setup)));
}

export function resetMemoryGridSetup(): MemoryGridSetup {
  const setup = normalizeMemoryGridSetup({ difficulty: "standard" });
  saveMemoryGridSetup(setup);
  return setup;
}
