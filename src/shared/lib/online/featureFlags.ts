import { useSyncExternalStore } from "react";
import { FEATURE_FLAGS_KEY } from "../../constants/storage";

export type FeatureFlagKey =
  | "classes_ui"
  | "competitions_ui"
  | "group_stats_ui"
  | "online_competitions";

export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  label: string;
  description: string;
}

export type FeatureFlagsSnapshot = Record<FeatureFlagKey, boolean>;
type FeatureFlagOverrides = Partial<Record<FeatureFlagKey, boolean>>;

const FEATURE_FLAGS_EVENT = "neurosprint:feature-flags-changed";

export const FEATURE_FLAG_DEFINITIONS: FeatureFlagDefinition[] = [
  {
    key: "classes_ui",
    label: "Классы",
    description: "Показывает страницы классов и связанный UI."
  },
  {
    key: "competitions_ui",
    label: "Соревнования",
    description: "Показывает страницу соревнований и подготовленный соревновательный интерфейс."
  },
  {
    key: "group_stats_ui",
    label: "Групповая статистика",
    description: "Открывает групповые аналитические экраны."
  },
  {
    key: "online_competitions",
    label: "Онлайн-режим",
    description: "Разрешает online/runtime-контур для будущих сетевых функций."
  }
];

function envFlag(value: string | undefined, fallback = false): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function getDefaultFeatureFlags(): FeatureFlagsSnapshot {
  const onlineCompetitions =
    envFlag(import.meta.env.VITE_FEATURE_ONLINE_COMPETITIONS) ||
    envFlag(import.meta.env.VITE_ONLINE_COMPETITIONS);

  return {
    classes_ui: envFlag(import.meta.env.VITE_FEATURE_CLASSES_UI),
    competitions_ui: envFlag(import.meta.env.VITE_FEATURE_COMPETITIONS_UI),
    group_stats_ui: envFlag(import.meta.env.VITE_FEATURE_GROUP_STATS_UI),
    online_competitions: onlineCompetitions
  };
}

function readOverrides(): FeatureFlagOverrides {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(FEATURE_FLAGS_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const overrides: FeatureFlagOverrides = {};

    for (const definition of FEATURE_FLAG_DEFINITIONS) {
      const value = parsed[definition.key];
      if (typeof value === "boolean") {
        overrides[definition.key] = value;
      }
    }

    return overrides;
  } catch {
    return {};
  }
}

function emitFeatureFlagsChange(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(FEATURE_FLAGS_EVENT));
}

export function getFeatureFlagsSnapshot(): FeatureFlagsSnapshot {
  return {
    ...getDefaultFeatureFlags(),
    ...readOverrides()
  };
}

export function getFeatureFlagOverride(key: FeatureFlagKey): boolean | null {
  const overrides = readOverrides();
  return key in overrides ? overrides[key] ?? null : null;
}

export function hasFeatureFlagOverrides(): boolean {
  return Object.keys(readOverrides()).length > 0;
}

export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  return getFeatureFlagsSnapshot()[key];
}

export function setFeatureFlagOverride(
  key: FeatureFlagKey,
  value: boolean | null
): void {
  if (typeof window === "undefined") {
    return;
  }

  const overrides = readOverrides();
  if (value === null) {
    delete overrides[key];
  } else {
    overrides[key] = value;
  }

  if (Object.keys(overrides).length === 0) {
    window.localStorage.removeItem(FEATURE_FLAGS_KEY);
  } else {
    window.localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(overrides));
  }

  emitFeatureFlagsChange();
}

export function clearFeatureFlagOverrides(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(FEATURE_FLAGS_KEY);
  emitFeatureFlagsChange();
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== FEATURE_FLAGS_KEY) {
      return;
    }
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(FEATURE_FLAGS_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(FEATURE_FLAGS_EVENT, onStoreChange);
  };
}

export function useFeatureFlags(): FeatureFlagsSnapshot {
  return useSyncExternalStore(subscribe, getFeatureFlagsSnapshot, getFeatureFlagsSnapshot);
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const snapshot = useFeatureFlags();
  return snapshot[key];
}
