import type { FeatureFlagKey } from "../online/featureFlags";
import type { AppRole } from "../../types/domain";

export type SiteRole = "user" | "moderator" | "admin";

const DEFAULT_SITE_ROLE: SiteRole = "user";

export function normalizeSiteRole(value: unknown): SiteRole {
  if (value === "admin" || value === "moderator" || value === "user") {
    return value;
  }

  return DEFAULT_SITE_ROLE;
}

export function isSiteAdmin(siteRole: SiteRole): boolean {
  return siteRole === "admin";
}

export function isModerator(siteRole: SiteRole): boolean {
  return siteRole === "moderator" || siteRole === "admin";
}

export function canUseAdminArea(siteRole: SiteRole): boolean {
  return isSiteAdmin(siteRole);
}

export function canModerateIdeas(siteRole: SiteRole): boolean {
  return isModerator(siteRole);
}

export function canReviewFeedback(siteRole: SiteRole): boolean {
  return isModerator(siteRole);
}

export function canUseTeacherArea(profileRole: AppRole, siteRole: SiteRole): boolean {
  return profileRole === "teacher" || isModerator(siteRole);
}

export function canAccessFeature(
  flag: FeatureFlagKey,
  enabled: boolean,
  profileRole: AppRole,
  siteRole: SiteRole
): boolean {
  if (!enabled) {
    return false;
  }

  switch (flag) {
    case "classes_ui":
    case "competitions_ui":
    case "group_stats_ui":
      return canUseTeacherArea(profileRole, siteRole);
    case "online_competitions":
      return canUseAdminArea(siteRole);
    default:
      return false;
  }
}
