import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { ACTIVE_USER_KEY, APP_ROLE_KEY } from "../../src/shared/constants/storage";

vi.mock("../../src/entities/group/groupRepository", () => ({
  groupRepository: {
    listGroups: vi.fn().mockResolvedValue([]),
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

vi.mock("../../src/entities/user/userRepository", () => ({
  userRepository: userRepoMocks
}));

import { SettingsPage } from "../../src/pages/SettingsPage";

describe("SettingsPage dev mode", () => {
  beforeEach(() => {
    localStorage.clear();
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

    expect(screen.getByTestId("dev-tools-hidden-note")).toBeInTheDocument();
    expect(screen.queryByTestId("settings-fixture-block")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Сигналы старт/финиш")).toBeChecked();
    expect(screen.getByLabelText("Звук клика")).not.toBeChecked();

    await user.click(screen.getByTestId("dev-mode-toggle"));
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

    expect(await screen.findByTestId("dev-mode-role-note")).toBeInTheDocument();
    expect(screen.getByTestId("export-role-note")).toBeInTheDocument();
    expect(screen.queryByTestId("dev-mode-toggle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("export-csv-btn")).not.toBeInTheDocument();

    expect(screen.getByLabelText(/Timed: лимит по умолчанию/i)).toBeDisabled();
    expect(screen.getByTestId("app-role-select")).toBeDisabled();
    expect(screen.getByLabelText(/Сигналы старт\/финиш/i)).toBeEnabled();
  });
});
