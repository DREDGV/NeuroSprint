import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { StatsPage } from "../../src/pages/StatsPage";
import { ACTIVE_USER_KEY } from "../../src/shared/constants/storage";

const mocks = vi.hoisted(() => ({
  sessionRepository: {
    aggregateDailyClassic: vi.fn(),
    aggregateDailyTimed: vi.fn(),
    aggregateDailyReaction: vi.fn(),
    aggregateDailyNBack: vi.fn(),
    aggregateDailyMemoryGrid: vi.fn(),
    aggregateDailyDecisionRush: vi.fn(),
    aggregateDailySprintMath: vi.fn(),
    listByUser: vi.fn(),
    aggregateDailyByModeId: vi.fn(),
    aggregateDailyCompareBand: vi.fn()
  },
  dailyChallengeRepository: {
    getCompletionSummary: vi.fn(),
    listHistory: vi.fn(),
    getStreakSummary: vi.fn(),
    listCompletionTrend: vi.fn()
  },
  achievementRepository: {
    getUserAchievements: vi.fn()
  },
  levelRepository: {
    getOrCreateUserLevel: vi.fn(),
    getRecentXPLogs: vi.fn()
  }
}));

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: mocks.sessionRepository
}));

vi.mock("../../src/entities/challenge/dailyChallengeRepository", () => ({
  dailyChallengeRepository: mocks.dailyChallengeRepository
}));

vi.mock("../../src/entities/achievement/achievementRepository", () => ({
  achievementRepository: mocks.achievementRepository
}));

vi.mock("../../src/entities/level/levelRepository", () => ({
  levelRepository: mocks.levelRepository
}));

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

describe("Stats achievements tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(ACTIVE_USER_KEY, "u1");

    mocks.sessionRepository.aggregateDailyClassic.mockResolvedValue([]);
    mocks.sessionRepository.aggregateDailyTimed.mockResolvedValue([]);
    mocks.sessionRepository.aggregateDailyReaction.mockResolvedValue([]);
    mocks.sessionRepository.aggregateDailyNBack.mockResolvedValue([]);
    mocks.sessionRepository.aggregateDailyMemoryGrid.mockResolvedValue([]);
    mocks.sessionRepository.aggregateDailyDecisionRush.mockResolvedValue([]);
    mocks.sessionRepository.aggregateDailySprintMath.mockResolvedValue([]);
    mocks.sessionRepository.aggregateDailyByModeId.mockResolvedValue([]);
    mocks.sessionRepository.listByUser.mockResolvedValue([]);
    mocks.sessionRepository.aggregateDailyCompareBand.mockResolvedValue([]);

    mocks.dailyChallengeRepository.getCompletionSummary.mockResolvedValue({
      period: 30,
      total: 0,
      completed: 0,
      pending: 0,
      completionRatePct: 0
    });
    mocks.dailyChallengeRepository.listHistory.mockResolvedValue([]);
    mocks.dailyChallengeRepository.getStreakSummary.mockResolvedValue({
      period: 30,
      currentStreakDays: 0,
      bestStreakDays: 0,
      completedDays: 0
    });
    mocks.dailyChallengeRepository.listCompletionTrend.mockResolvedValue([]);

    mocks.levelRepository.getOrCreateUserLevel.mockResolvedValue({
      id: "u1",
      userId: "u1",
      level: 4,
      currentXP: 80,
      totalXP: 380,
      xpToNextLevel: 200,
      lastLevelUpAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-09T10:00:00.000Z"
    });
    mocks.levelRepository.getRecentXPLogs.mockResolvedValue([
      {
        id: "xp1",
        userId: "u1",
        source: "achievement",
        amount: 30,
        achievementId: "skill_memory_match_10",
        createdAt: "2026-03-09T09:00:00.000Z"
      }
    ]);
    mocks.achievementRepository.getUserAchievements.mockResolvedValue([
      {
        id: "ua1",
        userId: "u1",
        achievementId: "sessions_10",
        progress: 100,
        completed: true,
        completedAt: "2026-03-08T10:00:00.000Z",
        createdAt: "2026-03-08T10:00:00.000Z",
        updatedAt: "2026-03-08T10:00:00.000Z"
      },
      {
        id: "ua2",
        userId: "u1",
        achievementId: "skill_memory_match_10",
        progress: 60,
        completed: false,
        completedAt: null,
        createdAt: "2026-03-09T09:00:00.000Z",
        updatedAt: "2026-03-09T09:00:00.000Z"
      }
    ]);
  });

  it("opens achievements tab from hash and shows level progress with the catalog", async () => {
    render(
      <MemoryRouter initialEntries={["/stats#achievements"]}>
        <ActiveUserProvider>
          <StatsPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("stats-achievements-tab")).toBeInTheDocument();
    expect(screen.getByTestId("level-progress-widget")).toBeInTheDocument();
    expect(screen.getByTestId("achievement-list")).toBeInTheDocument();
    expect(screen.getByText("Ближайшая цель")).toBeInTheDocument();
    expect(screen.getByText("Карта памяти")).toBeInTheDocument();
    expect(screen.getByText("Открыть достижения и XP →")).toHaveAttribute(
      "href",
      "/stats#achievements"
    );
  });
});
