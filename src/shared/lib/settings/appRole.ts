import { APP_ROLE_KEY } from "../../constants/storage";
import type { AppRole } from "../../types/domain";

export const DEFAULT_APP_ROLE: AppRole = "home";
const APP_ROLE_CHANGED_EVENT = "ns:app-role-changed";

function normalizeAppRole(value: unknown): AppRole {
  if (value === "teacher" || value === "student" || value === "home" || value === "admin") {
    return value;
  }
  return DEFAULT_APP_ROLE;
}

export function getAppRole(): AppRole {
  try {
    return normalizeAppRole(localStorage.getItem(APP_ROLE_KEY));
  } catch {
    return DEFAULT_APP_ROLE;
  }
}

export function saveAppRole(role: AppRole): void {
  const normalized = normalizeAppRole(role);
  localStorage.setItem(APP_ROLE_KEY, normalized);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<AppRole>(APP_ROLE_CHANGED_EVENT, { detail: normalized })
    );
  }
}

export function appRoleLabel(role: AppRole): string {
  if (role === "teacher") {
    return "Учитель";
  }
  if (role === "student") {
    return "Ученик";
  }
  if (role === "home") {
    return "Домашний";
  }
  if (role === "admin") {
    return "Администратор";
  }
  return "Домашний";
}

export function subscribeAppRole(listener: (role: AppRole) => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail;
    listener(normalizeAppRole(detail));
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== APP_ROLE_KEY) {
      return;
    }
    listener(normalizeAppRole(event.newValue));
  };

  window.addEventListener(APP_ROLE_CHANGED_EVENT, onCustom);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(APP_ROLE_CHANGED_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
