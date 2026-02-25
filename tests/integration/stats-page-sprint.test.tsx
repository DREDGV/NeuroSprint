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
    aggregateDailySprintMath: vi.fn(),
    aggregateDailyByModeId: vi.fn()
  }
}));

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: mocks.sessionRepository
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

    const summary = screen.getByTestId("stats-sprint-summary");
    expect(within(summary).getByText("Sprint Math: Все")).toBeInTheDocument();
    expect(within(summary).getByText("16.00")).toBeInTheDocument();

    await user.click(screen.getByTestId("stats-sprint-filter-mixed"));
    expect(within(summary).getByText("Sprint Math: Mixed")).toBeInTheDocument();
    expect(within(summary).getByText("10.00")).toBeInTheDocument();
  });
});
