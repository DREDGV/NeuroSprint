import type { AppRole } from "../../types/domain";

export type AppPermission =
  | "profiles:view"
  | "profiles:create"
  | "profiles:edit"
  | "profiles:role:update"
  | "profiles:activate"
  | "classes:view"
  | "classes:manage"
  | "stats:group:view"
  | "stats:comparison:view"
  | "settings:view"
  | "settings:training:update"
  | "settings:audio:update"
  | "settings:role:update"
  | "settings:export"
  | "settings:devtools";

const ROLE_PERMISSIONS: Record<AppRole, AppPermission[]> = {
  teacher: [
    "profiles:view",
    "profiles:create",
    "profiles:edit",
    "profiles:role:update",
    "profiles:activate",
    "classes:view",
    "classes:manage",
    "stats:group:view",
    "stats:comparison:view",
    "settings:view",
    "settings:training:update",
    "settings:audio:update",
    "settings:role:update",
    "settings:export",
    "settings:devtools"
  ],
  student: [
    "profiles:view",
    "profiles:create",
    "profiles:activate",
    "settings:view",
    "settings:audio:update"
  ],
  home: [
    "profiles:view",
    "profiles:create",
    "profiles:edit",
    "profiles:activate",
    "stats:comparison:view",
    "settings:view",
    "settings:training:update",
    "settings:audio:update",
    "settings:export"
  ]
};

export function hasPermission(role: AppRole, permission: AppPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function rolesWithPermission(permission: AppPermission): AppRole[] {
  return (Object.keys(ROLE_PERMISSIONS) as AppRole[]).filter((role) =>
    ROLE_PERMISSIONS[role].includes(permission)
  );
}

export function canViewProfiles(role: AppRole): boolean {
  return hasPermission(role, "profiles:view");
}

export function canCreateProfiles(role: AppRole): boolean {
  return hasPermission(role, "profiles:create");
}

export function canEditProfiles(role: AppRole): boolean {
  return hasPermission(role, "profiles:edit");
}

export function canUpdateProfileRole(role: AppRole): boolean {
  return hasPermission(role, "profiles:role:update");
}

export function canActivateProfile(role: AppRole): boolean {
  return hasPermission(role, "profiles:activate");
}

export function canViewClasses(role: AppRole): boolean {
  return hasPermission(role, "classes:view");
}

export function canManageClasses(role: AppRole): boolean {
  return hasPermission(role, "classes:manage");
}

export function canViewGroupStats(role: AppRole): boolean {
  return hasPermission(role, "stats:group:view");
}

export function canViewComparisonStats(role: AppRole): boolean {
  return hasPermission(role, "stats:comparison:view");
}

export function canViewSettings(role: AppRole): boolean {
  return hasPermission(role, "settings:view");
}

export function canEditTrainingSettings(role: AppRole): boolean {
  return hasPermission(role, "settings:training:update");
}

export function canEditAudioSettings(role: AppRole): boolean {
  return hasPermission(role, "settings:audio:update");
}

export function canUpdateActiveUserRole(role: AppRole): boolean {
  return hasPermission(role, "settings:role:update");
}

export function canExportData(role: AppRole): boolean {
  return hasPermission(role, "settings:export");
}

export function canUseDevTools(role: AppRole): boolean {
  return hasPermission(role, "settings:devtools");
}
