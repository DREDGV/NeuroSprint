export function isLocalDevProfileAccessBypassEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const host = window.location.hostname.toLowerCase();
  const isLocalHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]";

  return Boolean(import.meta.env.DEV && isLocalHost);
}
