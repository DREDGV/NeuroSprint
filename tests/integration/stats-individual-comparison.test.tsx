import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { ACTIVE_USER_KEY, APP_ROLE_KEY } from "../../src/shared/constants/storage";
import type { GroupMetric, TrainingModeId } from "../../src/shared/types/domain";

const mocks = vi.hoisted(() => {
  const sessionRepository = {
    aggregateDailyByModeId: vi.fn(),
    getIndividualInsights: vi.fn(),
    getModeMetricSnapshot: vi.fn()
  };
  const trainingRepository = {
    listUserModeProfiles: vi.fn(),
    listRecentSessionsByMode: vi.fn()
  };
  const userRepository = {
    list: vi.fn()
  };
  const groupRepository = {
    listGroupsForUser: vi.fn(),
    aggregateGroupStats: vi.fn()
  };
  return {
    sessionRepository,
    trainingRepository,
    userRepository,
    groupRepository
  };
});

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: mocks.sessionRepository
}));

vi.mock("../../src/entities/training/trainingRepository", () => ({
  trainingRepository: mocks.trainingRepository
}));

vi.mock("../../src/entities/user/userRepository", () => ({
  userRepository: mocks.userRepository
}));

vi.mock("../../src/entities/group/groupRepository", () => ({
  groupRepository: mocks.groupRepository
}));

import { StatsIndividualPage } from "../../src/pages/StatsIndividualPage";

describe("StatsIndividual comparison", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    mocks.sessionRepository.aggregateDailyByModeId.mockResolvedValue([]);
    mocks.sessionRepository.getIndividualInsights.mockResolvedValue({
      streakDays: 3,
      currentWeekAvgScore: 24,
      previousWeekAvgScore: 19,
      recommendation: {
        modeId: "classic_plus" as TrainingModeId,
        reason: "test",
        confidence: 0.7
      }
    });
    mocks.sessionRepository.getModeMetricSnapshot.mockResolvedValue({
      summary: {
        best: 72,
        avg: 55,
        worst: 33,
        sessionsTotal: 90,
        usersTotal: 10
      },
      byUser: [
        { userId: "u1", value: 60, sessions: 8 },
        { userId: "u2", value: 50, sessions: 8 }
      ]
    });
    mocks.trainingRepository.listUserModeProfiles.mockResolvedValue([]);
    mocks.trainingRepository.listRecentSessionsByMode.mockResolvedValue([]);
    mocks.userRepository.list.mockResolvedValue([
      { id: "u1", name: "User 1", role: "teacher", createdAt: "2026-02-20T00:00:00.000Z" },
      { id: "u2", name: "User 2", role: "student", createdAt: "2026-02-20T00:00:00.000Z" }
    ]);
    mocks.groupRepository.listGroupsForUser.mockResolvedValue([
      { id: "g1", name: "Group A", createdAt: "2026-02-20T00:00:00.000Z" }
    ]);
    mocks.groupRepository.aggregateGroupStats.mockResolvedValue({
      summary: {
        best: 65,
        avg: 58,
        worst: 40,
        sessionsTotal: 50,
        membersTotal: 12
      },
      trend: [],
      levelDistribution: []
    });
  });

  it("renders comparison cards for user/group/global values", async () => {
    localStorage.setItem(ACTIVE_USER_KEY, "u1");

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <StatsIndividualPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    const comparison = await screen.findByTestId("individual-comparison-block");
    expect(comparison).toBeInTheDocument();
    expect(within(comparison).getByText("Все пользователи")).toBeInTheDocument();
    expect((await screen.findAllByText("Group A")).length).toBeGreaterThan(0);

    expect(within(comparison).getByText("60.00")).toBeInTheDocument();
    expect(within(comparison).getByText("55.00")).toBeInTheDocument();
    expect(await screen.findByTestId("individual-leaderboard-block")).toBeInTheDocument();
    expect(await screen.findByTestId("individual-leaderboard-active-user")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("User 1")).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.sessionRepository.getModeMetricSnapshot).toHaveBeenCalledWith(
        "classic_plus",
        "score" as GroupMetric,
        30
      );
      expect(mocks.groupRepository.aggregateGroupStats).toHaveBeenCalledWith(
        "g1",
        "classic_plus",
        30,
        "score"
      );
    });
  });

  it("reloads leaderboard by selected period", async () => {
    const user = userEvent.setup();
    localStorage.setItem(ACTIVE_USER_KEY, "u1");

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <StatsIndividualPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    await screen.findByTestId("individual-leaderboard-block");
    await user.selectOptions(screen.getByTestId("individual-leaderboard-period"), "7");

    await waitFor(() => {
      expect(mocks.sessionRepository.getModeMetricSnapshot).toHaveBeenCalledWith(
        "classic_plus",
        "score" as GroupMetric,
        7
      );
    });
  });

  it("hides comparison block for student role", async () => {
    localStorage.setItem(ACTIVE_USER_KEY, "u1");
    localStorage.setItem(APP_ROLE_KEY, "student");

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <StatsIndividualPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("stats-individual-page")).toBeInTheDocument();
    expect(screen.getByTestId("individual-comparison-restricted-note")).toBeInTheDocument();
    expect(screen.queryByTestId("individual-comparison-block")).not.toBeInTheDocument();
    expect(screen.queryByTestId("individual-leaderboard-block")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.sessionRepository.getModeMetricSnapshot).not.toHaveBeenCalled();
      expect(mocks.groupRepository.aggregateGroupStats).not.toHaveBeenCalled();
    });
  });
});



