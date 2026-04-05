import type { AppRole } from "../../types/domain";

export function allowPrivilegedProfileRoles(): boolean {
  return import.meta.env.VITE_ALLOW_PRIVILEGED_PROFILE_ROLES === "true";
}

export function isPrivilegedProfileRole(role: AppRole): boolean {
  return role === "teacher" || role === "admin";
}

export function canSelfAssignProfileRole(role: AppRole): boolean {
  return allowPrivilegedProfileRoles() || !isPrivilegedProfileRole(role);
}

export function getSelfServiceDefaultRole(): AppRole {
  return "home";
}

export function getSelfServiceCreateRoles(): AppRole[] {
  return allowPrivilegedProfileRoles()
    ? ["home", "student", "teacher", "admin"]
    : ["home", "student"];
}

export function getEditableSelfServiceRoles(currentRole: AppRole): AppRole[] {
  const baseRoles = getSelfServiceCreateRoles();
  return baseRoles.includes(currentRole) ? baseRoles : [currentRole, ...baseRoles];
}
