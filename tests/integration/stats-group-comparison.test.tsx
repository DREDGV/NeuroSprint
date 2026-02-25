import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const groupRepository = {
    listGroups: vi.fn(),
    listMembers: vi.fn(),
    aggregateGroupStats: vi.fn(),
    getUserPercentileInGroup: vi.fn(),
    createGroup: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn()
  };
  const userRepository = {
    list: vi.fn()
  };
  const sessionRepository = {
    getModeMetricSnapshot: vi.fn()
  };
  return {
    groupRepository,
    userRepository,
    sessionRepository
  };
});

vi.mock("../../src/entities/group/groupRepository", () => ({
  groupRepository: mocks.groupRepository
}));

vi.mock("../../src/entities/user/userRepository", () => ({
  userRepository: mocks.userRepository
}));

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: mocks.sessionRepository
}));

import { StatsGroupPage } from "../../src/pages/StatsGroupPage";

describe("StatsGroup comparison", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.groupRepository.listGroups.mockResolvedValue([
      { id: "g1", name: "Group A", createdAt: "2026-02-20T00:00:00.000Z" },
      { id: "g2", name: "Group B", createdAt: "2026-02-20T00:00:00.000Z" }
    ]);
    mocks.userRepository.list.mockResolvedValue([
      { id: "u1", name: "User 1", createdAt: "2026-02-20T00:00:00.000Z" },
      { id: "u2", name: "User 2", createdAt: "2026-02-20T00:00:00.000Z" },
      { id: "u3", name: "User 3", createdAt: "2026-02-20T00:00:00.000Z" }
    ]);
    mocks.groupRepository.listMembers.mockImplementation(async (groupId: string) => {
      if (groupId === "g1") {
        return [
          { id: "m1", groupId: "g1", userId: "u1", joinedAt: "2026-02-20T00:00:00.000Z" },
          { id: "m2", groupId: "g1", userId: "u2", joinedAt: "2026-02-20T00:00:00.000Z" }
        ];
      }
      return [{ id: "m3", groupId: "g2", userId: "u3", joinedAt: "2026-02-20T00:00:00.000Z" }];
    });
    mocks.groupRepository.aggregateGroupStats.mockImplementation(async (groupId: string) => {
      if (groupId === "g1") {
        return {
          summary: {
            best: 70,
            avg: 63,
            worst: 50,
            sessionsTotal: 30,
            membersTotal: 2
          },
          trend: [],
          levelDistribution: []
        };
      }
      return {
        summary: {
          best: 64,
          avg: 51,
          worst: 42,
          sessionsTotal: 22,
          membersTotal: 1
        },
        trend: [],
        levelDistribution: []
      };
    });
    mocks.groupRepository.getUserPercentileInGroup.mockResolvedValue({
      userId: "u1",
      metric: "score",
      percentile: 80,
      userValue: 66,
      sampleSize: 2
    });
    mocks.sessionRepository.getModeMetricSnapshot.mockResolvedValue({
      summary: {
        best: 75,
        avg: 57,
        worst: 31,
        sessionsTotal: 120,
        usersTotal: 20
      },
      byUser: []
    });
  });

  it("renders comparison between current group, another group and global stats", async () => {
    render(
      <MemoryRouter>
        <StatsGroupPage />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("group-comparison-block")).toBeInTheDocument();
    expect(screen.getByText("Сравнение групп и общей статистики")).toBeInTheDocument();
    expect(screen.getByText("Группа для сравнения")).toBeInTheDocument();
    expect(screen.getByText("Все пользователи")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText("63.00").length).toBeGreaterThan(0);
      expect(screen.getAllByText("51.00").length).toBeGreaterThan(0);
      expect(screen.getAllByText("57.00").length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(mocks.groupRepository.aggregateGroupStats).toHaveBeenCalledWith(
        "g1",
        "classic_plus",
        30,
        "score"
      );
      expect(mocks.groupRepository.aggregateGroupStats).toHaveBeenCalledWith(
        "g2",
        "classic_plus",
        30,
        "score"
      );
    });
  });

  it("supports sprint math module and mode filters in comparison flow", async () => {
    render(
      <MemoryRouter>
        <StatsGroupPage />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("group-comparison-block")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("stats-group-module-select"), {
      target: { value: "sprint_math" }
    });

    await waitFor(() => {
      expect(
        (screen.getByTestId("stats-group-mode-select") as HTMLSelectElement).value
      ).toBe("sprint_add_sub");
    });

    fireEvent.change(screen.getByTestId("stats-group-mode-select"), {
      target: { value: "sprint_mixed" }
    });

    await waitFor(() => {
      expect(mocks.groupRepository.aggregateGroupStats).toHaveBeenCalledWith(
        "g1",
        "sprint_mixed",
        30,
        "score"
      );
      expect(mocks.groupRepository.aggregateGroupStats).toHaveBeenCalledWith(
        "g2",
        "sprint_mixed",
        30,
        "score"
      );
      expect(mocks.sessionRepository.getModeMetricSnapshot).toHaveBeenCalledWith(
        "sprint_mixed",
        "score",
        30
      );
    });
  });
});
