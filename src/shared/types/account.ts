import type { SiteRole } from "../lib/auth/siteAccess";

export interface AccountProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  siteRole: SiteRole;
  createdAt: string | null;
  lastSignInAt: string | null;
}
