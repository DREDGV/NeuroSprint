import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { ACTIVE_USER_KEY, APP_ROLE_KEY } from "../../src/shared/constants/storage";

vi.mock("../../src/app/useAuth", () => ({
  useAuth: () => ({
    isConfigured: true,
    isAuthenticated: true,
    isLoading: false,
    account: { id: "acc-1", email: "t@t.com", displayName: "T", createdAt: null, lastSignInAt: null },
    siteRole: "user",
    isSiteAdmin: false,
    isModerator: false
  })
}));

vi.mock("../../src/shared/lib/auth/profileRolePolicy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/shared/lib/auth/profileRolePolicy")>();
  return {
    ...actual,
    allowPrivilegedProfileRoles: () => true
  };
});

vi.mock("../../src/entities/group/groupRepository", () => ({
  groupRepository: {
    listGroups: vi.fn().mockResolvedValue([]),
    listOwnedGroups: vi.fn().mockResolvedValue([]),
    aggregateGroupStats: vi.fn().mockResolvedValue({
      summary: { best: null, avg: null, worst: null, sessionsTotal: 0, membersTotal: 0 },
      trend: [],
      levelDistribution: []
    })
  }
}));

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: {
    getModeMetricSnapshot: vi.fn().mockResolvedValue({
      summary: { best: null, avg: null, worst: null, sessionsTotal: 0, usersTotal: 0 },
      byUser: []
    })
  }
}));

vi.mock("../../src/entities/preferences/preferenceRepository", () => ({
  preferenceRepository: {
    saveAudioSettings: vi.fn().mockResolvedValue(undefined),
    getOrCreate: vi.fn().mockResolvedValue({
      id: "p1",
      userId: "u1",
      schulteThemeId: "classic_bw",
      schulteCustomTheme: null,
      audioSettings: {
        muted: false,
        volume: 0.35,
        startEnd: true,
        click: false,
        correct: false,
        error: false
      },
      updatedAt: "2026-02-25T12:00:00.000Z"
    })
  }
}));

vi.mock("../../src/shared/lib/fixtures/classroomFixture", () => ({
  generateDemoClassroomFixture: vi.fn().mockResolvedValue({
    usersCreated: 0,
    groupsCreated: 0,
    sessionsCreated: 0,
    profilesCreated: 0,
    activeUserId: null
  })
}));

const userRepoMocks = vi.hoisted(() => ({
  getById: vi.fn(),
  updateRole: vi.fn(),
  list: vi.fn()
}));

const dbMocks = vi.hoisted(() => ({
  sessionsToArray: vi.fn(),
  classGroupsToArray: vi.fn(),
  groupMembersToArray: vi.fn(),
  userPreferencesToArray: vi.fn(),
  userModeProfilesToArray: vi.fn()
}));

const csvMocks = vi.hoisted(() => ({
  toCsv: vi.fn(() => "csv"),
  downloadTextFile: vi.fn()
}));

vi.mock("../../src/db/database", () => ({
  db: {
    sessions: { toArray: dbMocks.sessionsToArray },
    classGroups: { toArray: dbMocks.classGroupsToArray },
    groupMembers: { toArray: dbMocks.groupMembersToArray },
    userPreferences: { toArray: dbMocks.userPreferencesToArray },
    userModeProfiles: { toArray: dbMocks.userModeProfilesToArray }
  }
}));

vi.mock("../../src/shared/lib/export/csv", () => ({
  toCsv: csvMocks.toCsv,
  downloadTextFile: csvMocks.downloadTextFile
}));

vi.mock("../../src/entities/user/userRepository", () => ({
  userRepository: userRepoMocks
}));

import { SettingsPage } from "../../src/pages/SettingsPage";

function navigateToSection(sectionLabel: string) {
  const navButton = screen.getByRole("button", { name: new RegExp(sectionLabel, "i") });
  return navButton.click();
}

describe("SettingsPage dev mode", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    localStorage.setItem(APP_ROLE_KEY, "teacher");

    dbMocks.sessionsToArray.mockResolvedValue([]);
    dbMocks.classGroupsToArray.mockResolvedValue([]);
    dbMocks.groupMembersToArray.mockResolvedValue([]);
    dbMocks.userPreferencesToArray.mockResolvedValue([]);
    dbMocks.userModeProfilesToArray.mockResolvedValue([]);

    userRepoMocks.getById.mockResolvedValue({
      id: "u1",
      name: "Тест",
      role: "teacher",
      createdAt: "2026-02-25T12:00:00.000Z"
    });
    userRepoMocks.updateRole.mockResolvedValue(undefined);
    userRepoMocks.list.mockResolvedValue([
      {
        id: "u1",
        name: "Тест",
        role: "teacher",
        createdAt: "2026-02-25T12:00:00.000Z"
      },
      {
        id: "u2",
        name: "Тест 2",
        role: "teacher",
        createdAt: "2026-02-25T12:00:00.000Z"
      }
    ]);
  });

  it("hides demo tools until dev mode is enabled", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <SettingsPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    // General section is active by default — dev toggle and hidden note are here
    expect(screen.getByTestId("dev-tools-hidden-note")).toBeInTheDocument();
    expect(screen.getByTestId("dev-mode-toggle")).toBeInTheDocument();

    // Navigate to devtools — fixture block should not be visible yet (devMode off)
    await navigateToSection("Инструменты");
    expect(screen.queryByTestId("settings-fixture-block")).not.toBeInTheDocument();

    // Go back to general, enable dev mode
    await navigateToSection("Основные");
    await user.click(screen.getByTestId("dev-mode-toggle"));

    // Navigate to devtools — fixture block should now be visible
    await navigateToSection("Инструменты");
    expect(screen.getByTestId("settings-fixture-block")).toBeInTheDocument();
  });

  it("saves selected app role", async () => {
    const user = userEvent.setup();
    localStorage.setItem(ACTIVE_USER_KEY, "u1");

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <SettingsPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    // Navigate to profile section
    await navigateToSection("Профиль");

    await user.selectOptions(screen.getByTestId("app-role-select"), "student");
    await user.click(screen.getByTestId("save-settings-btn"));

    expect(localStorage.getItem(APP_ROLE_KEY)).toBe("student");
    expect(userRepoMocks.updateRole).toHaveBeenCalledWith("u1", "student");
  });

  it("blocks role downgrade for last teacher", async () => {
    const user = userEvent.setup();
    localStorage.setItem(ACTIVE_USER_KEY, "u1");
    userRepoMocks.list.mockResolvedValue([
      {
        id: "u1",
        name: "Тест",
        role: "teacher",
        createdAt: "2026-02-25T12:00:00.000Z"
      }
    ]);

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <SettingsPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    // Navigate to profile section
    await navigateToSection("Профиль");

    const roleSelect = await screen.findByTestId("app-role-select");
    await user.click(roleSelect);
    expect(screen.getByRole("option", { name: /Ученик/i })).toBeDisabled();
    expect(screen.getByRole("option", { name: /Домашний/i })).toBeDisabled();
  });

  it("applies student role policy in settings", async () => {
    localStorage.setItem(APP_ROLE_KEY, "student");
    localStorage.setItem(ACTIVE_USER_KEY, "u1");

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <SettingsPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    // General section — dev mode note for non-teacher
    expect(await screen.findByTestId("dev-mode-role-note")).toBeInTheDocument();
    expect(screen.queryByTestId("dev-mode-toggle")).not.toBeInTheDocument();

    // Navigate to export — role note visible, export button hidden
    await navigateToSection("Экспорт");
    expect(screen.getByTestId("export-role-note")).toBeInTheDocument();
    expect(screen.queryByTestId("export-csv-btn")).not.toBeInTheDocument();

    // Navigate to profile — app role select disabled
    await navigateToSection("Профиль");
    expect(screen.getByTestId("app-role-select")).toBeDisabled();
  });

  it("exports additional CSV files for preferences and mode profiles", async () => {
    const user = userEvent.setup();
    localStorage.setItem(APP_ROLE_KEY, "teacher");
    localStorage.setItem(ACTIVE_USER_KEY, "u1");

    dbMocks.userPreferencesToArray.mockResolvedValue([
      {
        id: "pref-1",
        userId: "u1",
        schulteThemeId: "classic_bw",
        schulteCustomTheme: null,
        audioSettings: {
          muted: false,
          volume: 0.5,
          startEnd: true,
          click: false,
          correct: false,
          error: false
        },
        updatedAt: "2026-02-28T00:00:00.000Z"
      }
    ]);
    dbMocks.userModeProfilesToArray.mockResolvedValue([
      {
        id: "profile-1",
        userId: "u1",
        moduleId: "schulte",
        modeId: "classic_plus",
        level: 3,
        autoAdjust: true,
        manualLevel: null,
        lastDecisionReason: null,
        lastEvaluatedAt: null,
        updatedAt: "2026-02-28T00:00:00.000Z"
      }
    ]);

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <SettingsPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    // Navigate to export section
    await navigateToSection("Экспорт");

    await user.click(await screen.findByTestId("export-csv-btn"));

    await waitFor(() => {
      expect(csvMocks.downloadTextFile).toHaveBeenCalledTimes(6);
    });

    const exportedNames = csvMocks.downloadTextFile.mock.calls.map((call) => call[0] as string);
    expect(exportedNames.some((name) => name.startsWith("neurosprint_user_preferences_"))).toBe(
      true
    );
    expect(exportedNames.some((name) => name.startsWith("neurosprint_user_mode_profiles_"))).toBe(
      true
    );
  });
});
