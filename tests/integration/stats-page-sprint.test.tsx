import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    aggregateDailyByModeId: vi.fn(),
    aggregateDailyCompareBand: vi.fn()
  },
  dailyChallengeRepository: {
    getCompletionSummary: vi.fn(),
    listHistory: vi.fn(),
    getStreakSummary: vi.fn(),
    listCompletionTrend: vi.fn()
  }
}));

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: mocks.sessionRepository
}));

vi.mock("../../src/entities/challenge/dailyChallengeRepository", () => ({
  dailyChallengeRepository: mocks.dailyChallengeRepository
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

describe("StatsPage sprint filters", () => {
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
    mocks.sessionRepository.aggregateDailySprintMath.mockResolvedValue([
      {
        date: "2026-02-25",
        throughput: 16,
        accuracy: 0.84,
        avgScore: 22,
        count: 3
      }
    ]);
    mocks.sessionRepository.aggregateDailyByModeId.mockImplementation(
      async (_userId: string, modeId: string) => {
        if (modeId === "sprint_add_sub") {
          return [
            {
              date: "2026-02-25",
              throughput: 20,
              accuracy: 0.9,
              avgScore: 28,
              count: 2
            }
          ];
        }
        return [
          {
            date: "2026-02-25",
            throughput: 10,
            accuracy: 0.72,
            avgScore: 14,
            count: 1
          }
        ];
      }
    );
    mocks.sessionRepository.aggregateDailyCompareBand.mockResolvedValue([]);
    mocks.dailyChallengeRepository.getCompletionSummary.mockResolvedValue({
      period: 30,
      total: 6,
      completed: 4,
      pending: 2,
      completionRatePct: 66.6667
    });
    mocks.dailyChallengeRepository.listHistory.mockResolvedValue([
      {
        challengeId: "u1:2026-02-25",
        localDate: "2026-02-25",
        modeId: "classic_plus",
        modeTitle: "Classic+",
        status: "completed",
        requiredAttempts: 1,
        attemptsCount: 1,
        completedAt: "2026-02-25T10:00:00.000Z"
      }
    ]);
    mocks.dailyChallengeRepository.getStreakSummary.mockResolvedValue({
      period: 30,
      currentStreakDays: 2,
      bestStreakDays: 5,
      completedDays: 4
    });
    mocks.dailyChallengeRepository.listCompletionTrend.mockResolvedValue([
      {
        localDate: "2026-02-24",
        completed: false,
        completionPct: 0,
        attemptsCount: 0
      },
      {
        localDate: "2026-02-25",
        completed: true,
        completionPct: 100,
        attemptsCount: 1
      }
    ]);
  });

  it("shows sprint submode filters and updates summary for selected submode", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <StatsPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    await user.click(await screen.findByTestId("stats-mode-sprint"));
    expect(screen.getByTestId("stats-sprint-filter-row")).toBeInTheDocument();
    expect(screen.getByTestId("stats-progress-headline")).toHaveTextContent(
      "Прогресс за период"
    );
    expect(screen.getByTestId("stats-progress-headline")).toHaveTextContent(
      "Лучший score: 22.00"
    );

    const summary = screen.getByTestId("stats-sprint-summary");
    expect(within(summary).getByText("Sprint Math: Все")).toBeInTheDocument();
    expect(within(summary).getByText("16.00")).toBeInTheDocument();

    await user.click(screen.getByTestId("stats-sprint-filter-mixed"));
    expect(within(summary).getByText("Sprint Math: Mixed")).toBeInTheDocument();
    expect(within(summary).getByText("10.00")).toBeInTheDocument();
  });

  it("renders reaction mode summary with reaction metrics", async () => {
    const user = userEvent.setup();
    mocks.sessionRepository.aggregateDailyReaction.mockResolvedValue([
      {
        date: "2026-02-25",
        avgReactionMs: 340,
        bestReactionMs: 280,
        accuracy: 0.88,
        avgScore: 142,
        count: 2
      }
    ]);

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <StatsPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    await user.click(await screen.findByTestId("stats-mode-reaction"));

    const summary = await screen.findByTestId("stats-reaction-summary");
    expect(within(summary).getByText("Reaction: итоги")).toBeInTheDocument();
    expect(within(summary).getByText("2")).toBeInTheDocument();
    expect(within(summary).getByText("340 мс")).toBeInTheDocument();
    expect(within(summary).getByText("88.0%")).toBeInTheDocument();

    expect(screen.getByTestId("stats-progress-headline")).toHaveTextContent(
      "Лучший отклик: 280 мс"
    );
  });

  it("renders nback mode summary and chart data", async () => {
    const user = userEvent.setup();
    mocks.sessionRepository.aggregateDailyNBack.mockResolvedValue([
      {
        date: "2026-02-25",
        accuracy: 0.82,
        avgScore: 36,
        speed: 26,
        count: 2
      }
    ]);

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <StatsPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    await user.click(await screen.findByTestId("stats-mode-nback"));
    const summary = await screen.findByTestId("stats-nback-summary");
    expect(within(summary).getByText("N-Back Lite: итоги")).toBeInTheDocument();
    expect(within(summary).getByText("2")).toBeInTheDocument();
    expect(within(summary).getByText("82.0%")).toBeInTheDocument();
    expect(within(summary).getByText("36.00")).toBeInTheDocument();
  });

  it("renders sprint submode comparison with best mode and deltas", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <StatsPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    await user.click(await screen.findByTestId("stats-mode-sprint"));

    const compare = screen.getByTestId("stats-sprint-comparison");
    expect(within(compare).getByTestId("stats-sprint-card-add-sub")).toHaveTextContent("Сессий: 2");
    expect(within(compare).getByTestId("stats-sprint-card-mixed")).toHaveTextContent("Сессий: 1");

    expect(screen.getByTestId("stats-sprint-best-mode")).toHaveTextContent(
      "Сильнее сейчас: Add/Sub"
    );

    const deltaGrid = screen.getByTestId("stats-sprint-delta-grid");
    expect(within(deltaGrid).getByText("+10.00")).toBeInTheDocument();
    expect(within(deltaGrid).getByText("+18.0%")).toBeInTheDocument();
    expect(within(deltaGrid).getByText("+14.00")).toBeInTheDocument();
    expect(within(deltaGrid).getByText("Да")).toBeInTheDocument();
  });

  it("loads compare mode and renders median/p25/p75 summary", async () => {
    const user = userEvent.setup();
    mocks.sessionRepository.aggregateDailyCompareBand.mockResolvedValue([
      {
        date: "2026-02-25",
        p25: 16,
        median: 20,
        p75: 24,
        usersCount: 4,
        sessionsCount: 8
      }
    ]);

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <StatsPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    await user.click(await screen.findByTestId("stats-compare-toggle"));

    expect(mocks.sessionRepository.aggregateDailyCompareBand).toHaveBeenCalledWith(
      ["classic_plus"],
      "duration_sec",
      30
    );

    const summary = await screen.findByTestId("stats-compare-summary");
    expect(within(summary).getByText("20.00 сек")).toBeInTheDocument();
    expect(within(summary).getByText("16.00 сек")).toBeInTheDocument();
    expect(within(summary).getByText("24.00 сек")).toBeInTheDocument();
  });

  it("reloads compare mode by selected period", async () => {
    const user = userEvent.setup();
    mocks.sessionRepository.aggregateDailyCompareBand.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <StatsPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    await user.click(await screen.findByTestId("stats-compare-toggle"));
    await user.selectOptions(screen.getByTestId("stats-compare-period"), "7");

    expect(mocks.sessionRepository.aggregateDailyCompareBand).toHaveBeenLastCalledWith(
      ["classic_plus"],
      "duration_sec",
      7
    );
  });

  it("renders daily challenge summary and reloads it by period", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ActiveUserProvider>
          <StatsPage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    const summary = await screen.findByTestId("stats-daily-challenge-summary");
    expect(within(summary).getByText("6")).toBeInTheDocument();
    expect(within(summary).getByText("4")).toBeInTheDocument();
    expect(within(summary).getByText("2")).toBeInTheDocument();
    expect(within(summary).getByText("66.7%")).toBeInTheDocument();
    expect(await screen.findByTestId("stats-daily-challenge-streak")).toHaveTextContent("2 дн.");
    expect(screen.getByTestId("stats-daily-challenge-streak")).toHaveTextContent("5 дн.");
    expect(screen.getByTestId("stats-daily-challenge-trend")).toBeInTheDocument();

    await user.selectOptions(screen.getByTestId("stats-challenge-period"), "7");

    expect(mocks.dailyChallengeRepository.getCompletionSummary).toHaveBeenLastCalledWith(
      "u1",
      7
    );
    expect(mocks.dailyChallengeRepository.listHistory).toHaveBeenLastCalledWith("u1", 7, 10);
    expect(mocks.dailyChallengeRepository.getStreakSummary).toHaveBeenLastCalledWith("u1", 7);
    expect(mocks.dailyChallengeRepository.listCompletionTrend).toHaveBeenLastCalledWith(
      "u1",
      7,
      60
    );
  });
});
