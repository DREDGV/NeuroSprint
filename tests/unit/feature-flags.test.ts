import { beforeEach, describe, expect, it } from "vitest";
import { FEATURE_FLAGS_KEY } from "../../src/shared/constants/storage";
import {
  clearFeatureFlagOverrides,
  getFeatureFlagOverride,
  getFeatureFlagsSnapshot,
  hasFeatureFlagOverrides,
  setFeatureFlagOverride
} from "../../src/shared/lib/online/featureFlags";

describe("feature flags", () => {
  beforeEach(() => {
    localStorage.removeItem(FEATURE_FLAGS_KEY);
  });

  it("defaults to hidden advanced features", () => {
    expect(getFeatureFlagsSnapshot()).toEqual({
      classes_ui: false,
      competitions_ui: false,
      group_stats_ui: false,
      online_competitions: false
    });
  });

  it("supports local overrides per browser", () => {
    setFeatureFlagOverride("classes_ui", true);
    setFeatureFlagOverride("group_stats_ui", true);

    expect(getFeatureFlagOverride("classes_ui")).toBe(true);
    expect(getFeatureFlagOverride("group_stats_ui")).toBe(true);
    expect(getFeatureFlagsSnapshot().classes_ui).toBe(true);
    expect(getFeatureFlagsSnapshot().group_stats_ui).toBe(true);
    expect(hasFeatureFlagOverrides()).toBe(true);
  });

  it("can clear overrides back to env defaults", () => {
    setFeatureFlagOverride("competitions_ui", true);
    expect(getFeatureFlagsSnapshot().competitions_ui).toBe(true);

    clearFeatureFlagOverrides();

    expect(getFeatureFlagOverride("competitions_ui")).toBeNull();
    expect(getFeatureFlagsSnapshot().competitions_ui).toBe(false);
    expect(hasFeatureFlagOverrides()).toBe(false);
  });

  it("returns a stable snapshot reference until flags actually change", () => {
    const firstSnapshot = getFeatureFlagsSnapshot();
    const secondSnapshot = getFeatureFlagsSnapshot();

    expect(secondSnapshot).toBe(firstSnapshot);

    setFeatureFlagOverride("classes_ui", true);

    const thirdSnapshot = getFeatureFlagsSnapshot();
    expect(thirdSnapshot).not.toBe(firstSnapshot);
    expect(thirdSnapshot.classes_ui).toBe(true);
  });
});
