import { beforeEach, describe, expect, it } from "vitest";
import { APP_ROLE_KEY } from "../../src/shared/constants/storage";
import {
  DEFAULT_APP_ROLE,
  appRoleLabel,
  getAppRole,
  saveAppRole
} from "../../src/shared/lib/settings/appRole";

describe("app role settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses teacher as default role", () => {
    expect(getAppRole()).toBe(DEFAULT_APP_ROLE);
  });

  it("persists selected role", () => {
    saveAppRole("home");
    expect(localStorage.getItem(APP_ROLE_KEY)).toBe("home");
    expect(getAppRole()).toBe("home");
  });

  it("falls back to default for invalid value", () => {
    localStorage.setItem(APP_ROLE_KEY, "invalid-role");
    expect(getAppRole()).toBe(DEFAULT_APP_ROLE);
  });

  it("returns localized labels", () => {
    expect(appRoleLabel("teacher")).toBe("Учитель");
    expect(appRoleLabel("student")).toBe("Ученик");
    expect(appRoleLabel("home")).toBe("Домашний");
  });
});
