import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";

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

vi.mock("../../src/shared/lib/fixtures/classroomFixture", () => ({
  generateDemoClassroomFixture: vi.fn().mockResolvedValue({
    usersCreated: 0,
    groupsCreated: 0,
    sessionsCreated: 0,
    profilesCreated: 0,
    activeUserId: null
  })
}));

import { SettingsPage } from "../../src/pages/SettingsPage";

describe("SettingsPage dev mode", () => {
  beforeEach(() => {
    localStorage.clear();
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
});
