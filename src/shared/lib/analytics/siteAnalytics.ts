import { track, type BeforeSendEvent as AnalyticsBeforeSendEvent } from "@vercel/analytics/react";
import type { Session } from "../../types/domain";
import type { SessionSaveResult } from "../../../entities/session/sessionRepository";
import type { AppRole } from "../../types/domain";
import { normalizeAnalyticsRoute, normalizeAnalyticsUrl } from "./routeNormalization";

type AnalyticsValue = string | number | boolean | null | undefined;
type SpeedInsightsBeforeSendEvent = {
  type: "vital";
  url: string;
  route?: string;
};

function roundMetric(value: number | null | undefined, digits = 0): number | undefined {
  if (value == null || !Number.isFinite(value)) {
    return undefined;
  }
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function isProductionBrowser(): boolean {
  return typeof window !== "undefined" && import.meta.env.PROD;
}

export function analyticsBeforeSend(
  event: AnalyticsBeforeSendEvent
): AnalyticsBeforeSendEvent | null {
  const normalizedUrl = normalizeAnalyticsUrl(event.url);
  if (normalizedUrl.includes("/favicon") || normalizedUrl.includes("/icon-")) {
    return null;
  }

  return {
    ...event,
    url: normalizedUrl
  };
}

export function speedInsightsBeforeSend(
  event: SpeedInsightsBeforeSendEvent
): SpeedInsightsBeforeSendEvent | null {
  const normalizedUrl = normalizeAnalyticsUrl(event.url);
  const normalizedRoute = normalizeAnalyticsRoute(event.route);

  return {
    ...event,
    url: normalizedUrl,
    route: normalizedRoute ?? undefined
  };
}

export function trackAnalyticsEvent(
  name: string,
  properties?: Record<string, AnalyticsValue>
): void {
  if (!isProductionBrowser()) {
    return;
  }

  track(name, properties);
}

export function trackProfileCreated(role: AppRole): void {
  trackAnalyticsEvent("profile_created", { role });
}

export function trackProfileActivated(role: AppRole): void {
  trackAnalyticsEvent("profile_activated", { role });
}

export function trackAccountRegistered(): void {
  trackAnalyticsEvent("account_registered");
  trackAnalyticsEvent("account_created");
}

export function trackLoginSucceeded(): void {
  trackAnalyticsEvent("login_succeeded");
}

export function trackLogoutSucceeded(): void {
  trackAnalyticsEvent("logout_succeeded");
}

export function trackPasswordResetRequested(): void {
  trackAnalyticsEvent("password_reset_requested");
}

export function trackAccountDeleted(): void {
  trackAnalyticsEvent("account_deleted");
}

export function trackImportStarted(profilesCount: number): void {
  trackAnalyticsEvent("import_started", { profiles_count: profilesCount });
}

export function trackImportCompleted(profilesCount: number): void {
  trackAnalyticsEvent("import_completed", { profiles_count: profilesCount });
}

export function trackSyncCompleted(scope: string): void {
  trackAnalyticsEvent("sync_completed", { scope });
}

export function trackSyncFailed(scope: string): void {
  trackAnalyticsEvent("sync_failed", { scope });
}

export function trackGuestStarted(): void {
  trackAnalyticsEvent("guest_started");
}

export function trackFirstTrainingAfterSignup(): void {
  trackAnalyticsEvent("first_training_after_signup");
}

export function trackTrainingSessionSaved(
  session: Session,
  result: SessionSaveResult
): void {
  trackAnalyticsEvent("training_session_completed", {
    module_id: session.moduleId,
    mode_id: session.modeId,
    duration_sec: roundMetric(session.durationMs / 1000),
    score: roundMetric(session.score),
    accuracy_pct: roundMetric(session.accuracy * 100, 1),
    speed: roundMetric(session.speed, 1),
    leveled_up: result.leveledUp ?? false,
    daily_training_completed: result.dailyTrainingCompleted ?? false
  });
}

// Feedback & Ideas events
export function trackFeedbackOpened(surface?: string): void {
  trackAnalyticsEvent("feedback_opened", { surface });
}

export function trackFeedbackSubmitted(
  surface: string,
  category: string,
  moduleId?: string,
  submitterKind?: "guest" | "account",
  starRating?: number
): void {
  trackAnalyticsEvent("feedback_submitted", {
    surface,
    category,
    module_id: moduleId,
    submitter_kind: submitterKind,
    star_rating: starRating
  });
}

export function trackFeedbackDismissed(surface?: string): void {
  trackAnalyticsEvent("feedback_dismissed", { surface });
}

export function trackPostSessionFeedbackSubmitted(
  moduleId?: string,
  starRating?: number
): void {
  trackAnalyticsEvent("post_session_feedback_submitted", {
    module_id: moduleId,
    star_rating: starRating
  });
}

export function trackIdeasViewed(): void {
  trackAnalyticsEvent("ideas_viewed");
}

export function trackIdeaSubmitted(category?: string): void {
  trackAnalyticsEvent("idea_submitted", { category });
}

export function trackIdeaVoteAdded(): void {
  trackAnalyticsEvent("idea_vote_added");
}

export function trackIdeaVoteRemoved(): void {
  trackAnalyticsEvent("idea_vote_removed");
}
