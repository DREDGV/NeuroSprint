import { describe, expect, it } from "vitest";
import {
  buildRoleAccess,
  canCreateProfiles,
  canEditAudioSettings,
  canEditProfiles,
  canEditTrainingSettings,
  canExportData,
  canManageClasses,
  canUpdateActiveUserRole,
  canUpdateProfileRole,
  canUseDevTools,
  canViewComparisonStats,
  canViewGroupStats,
  guardAccess,
  canViewProfiles,
  hasPermission,
  rolesWithPermission
} from "../../src/shared/lib/auth/permissions";

describe("permissions", () => {
  it("keeps classes and group stats teacher-only", () => {
    expect(canManageClasses("teacher")).toBe(true);
    expect(canManageClasses("student")).toBe(false);
    expect(canManageClasses("home")).toBe(false);

    expect(canViewGroupStats("teacher")).toBe(true);
    expect(canViewGroupStats("student")).toBe(false);
    expect(canViewGroupStats("home")).toBe(false);
  });

  it("keeps profiles visible for all roles", () => {
    expect(canViewProfiles("teacher")).toBe(true);
    expect(canViewProfiles("student")).toBe(true);
    expect(canViewProfiles("home")).toBe(true);
  });

  it("splits profile management by role", () => {
    expect(canCreateProfiles("teacher")).toBe(true);
    expect(canCreateProfiles("home")).toBe(true);
    expect(canCreateProfiles("student")).toBe(true);

    expect(canEditProfiles("teacher")).toBe(true);
    expect(canEditProfiles("home")).toBe(true);
    expect(canEditProfiles("student")).toBe(false);

    expect(canUpdateProfileRole("teacher")).toBe(true);
    expect(canUpdateProfileRole("home")).toBe(false);
    expect(canUpdateProfileRole("student")).toBe(false);
  });

  it("splits settings actions by role", () => {
    expect(canEditTrainingSettings("teacher")).toBe(true);
    expect(canEditTrainingSettings("home")).toBe(true);
    expect(canEditTrainingSettings("student")).toBe(false);

    expect(canEditAudioSettings("teacher")).toBe(true);
    expect(canEditAudioSettings("home")).toBe(true);
    expect(canEditAudioSettings("student")).toBe(true);

    expect(canUpdateActiveUserRole("teacher")).toBe(true);
    expect(canUpdateActiveUserRole("home")).toBe(false);
    expect(canUpdateActiveUserRole("student")).toBe(false);

    expect(canExportData("teacher")).toBe(true);
    expect(canExportData("home")).toBe(true);
    expect(canExportData("student")).toBe(false);

    expect(canUseDevTools("teacher")).toBe(true);
    expect(canUseDevTools("home")).toBe(false);
    expect(canUseDevTools("student")).toBe(false);
  });

  it("allows comparison stats for teacher/home only", () => {
    expect(canViewComparisonStats("teacher")).toBe(true);
    expect(canViewComparisonStats("home")).toBe(true);
    expect(canViewComparisonStats("student")).toBe(false);
  });

  it("supports generic permission lookup", () => {
    expect(hasPermission("teacher", "classes:manage")).toBe(true);
    expect(hasPermission("student", "classes:manage")).toBe(false);
  });

  it("returns roles that can access a permission", () => {
    expect(rolesWithPermission("classes:view")).toEqual(["teacher"]);
    expect(rolesWithPermission("settings:export")).toEqual(["teacher", "home"]);
  });

  it("builds normalized role access map", () => {
    const teacherAccess = buildRoleAccess("teacher");
    const studentAccess = buildRoleAccess("student");

    expect(teacherAccess.profiles.updateRole).toBe(true);
    expect(teacherAccess.settings.devtools).toBe(true);
    expect(studentAccess.profiles.updateRole).toBe(false);
    expect(studentAccess.settings.updateAudio).toBe(true);
    expect(studentAccess.settings.export).toBe(false);
  });

  it("guards denied actions with provided message", () => {
    let deniedMessage: string | null = null;

    const denied = guardAccess(false, (message) => {
      deniedMessage = message;
    }, "Нет доступа");
    const allowed = guardAccess(true, () => {
      throw new Error("unexpected call");
    }, "Не используется");

    expect(denied).toBe(false);
    expect(allowed).toBe(true);
    expect(deniedMessage).toBe("Нет доступа");
  });
});
