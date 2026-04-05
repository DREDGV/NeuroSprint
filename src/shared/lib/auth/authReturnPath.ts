import { AUTH_RETURN_PATH_KEY } from "../../constants/storage";

function normalizePath(path: string | null | undefined, fallback: string): string {
  if (!path) {
    return fallback;
  }

  return path.trim() || fallback;
}

export function setAuthReturnPath(
  path: string,
  options: { preserveIfPresent?: boolean } = {}
): void {
  try {
    if (options.preserveIfPresent) {
      const current = localStorage.getItem(AUTH_RETURN_PATH_KEY);
      if (current && current.trim()) {
        return;
      }
    }

    localStorage.setItem(AUTH_RETURN_PATH_KEY, normalizePath(path, "/profiles"));
  } catch {
    // Ignore storage failures in private mode.
  }
}

export function getAuthReturnPath(fallback = "/profiles"): string {
  try {
    return normalizePath(localStorage.getItem(AUTH_RETURN_PATH_KEY), fallback);
  } catch {
    return fallback;
  }
}

export function consumeAuthReturnPath(fallback = "/profiles"): string {
  const nextPath = getAuthReturnPath(fallback);

  try {
    localStorage.removeItem(AUTH_RETURN_PATH_KEY);
  } catch {
    // Ignore storage failures in private mode.
  }

  return nextPath;
}
