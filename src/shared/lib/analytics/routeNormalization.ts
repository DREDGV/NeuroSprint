const DYNAMIC_ROUTE_PATTERNS: Array<[RegExp, string]> = [
  [/^\/classes\/[^/]+$/, "/classes/:classId"],
  [/^\/training\/schulte\/[^/]+$/, "/training/schulte/:mode"]
];

function normalizePathname(pathname: string): string {
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  for (const [pattern, replacement] of DYNAMIC_ROUTE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return replacement;
    }
  }

  return trimmed || "/";
}

export function normalizeAnalyticsUrl(url: string): string {
  try {
    const parsed = new URL(
      url,
      typeof window !== "undefined" ? window.location.origin : "https://neurosprint.local"
    );
    parsed.pathname = normalizePathname(parsed.pathname);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

export function normalizeAnalyticsRoute(pathname: string | null | undefined): string | null {
  if (!pathname) {
    return null;
  }
  return normalizePathname(pathname);
}
