import { DEV_MODE_KEY } from "../../constants/storage";

export function getDevModeEnabled(): boolean {
  try {
    return localStorage.getItem(DEV_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDevModeEnabled(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(DEV_MODE_KEY, "1");
  } else {
    localStorage.removeItem(DEV_MODE_KEY);
  }
}
