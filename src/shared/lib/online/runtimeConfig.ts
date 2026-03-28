import { isFeatureEnabled } from "./featureFlags";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function getBrowserOrigin(): string {
  if (typeof window === "undefined") {
    return "http://localhost:5173";
  }
  return window.location.origin;
}

export function getOnlineApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }

  return `${trimTrailingSlash(getBrowserOrigin())}/api`;
}

export function getOnlineWebSocketUrl(): string {
  const configured = import.meta.env.VITE_WS_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }

  if (typeof window === "undefined") {
    return "ws://localhost:3212";
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export function isOnlineCompetitionsEnabled(): boolean {
  return isFeatureEnabled("online_competitions");
}

export function areSocialFeaturesEnabled(): boolean {
  return isFeatureEnabled("classes_ui") || isFeatureEnabled("competitions_ui");
}
