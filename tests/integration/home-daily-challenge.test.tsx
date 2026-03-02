import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { HomePage } from "../../src/pages/HomePage";
import { ACTIVE_USER_KEY } from "../../src/shared/constants/storage";

const mocks = vi.hoisted(() => ({
  sessionRepository: {
    getDailyProgressSummary: vi.fn(),
    getIndividualInsights: vi.fn()
  },
  dailyChallengeRepository: {
    getOrCreateForToday: vi.fn()
  },
  listUpcomingDailyChallengeModes: vi.fn(),
  userRepository: {
    list: vi.fn()
  }
}));

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: mocks.sessionRepository
}));

vi.mock("../../src/entities/challenge/dailyChallengeRepository", () => ({
  dailyChallengeRepository: mocks.dailyChallengeRepository,
  listUpcomingDailyChallengeModes: mocks.listUpcomingDailyChallengeModes
}));

vi.mock("../../src/entities/user/userRepository", () => ({
  userRepository: mocks.userRepository
}));

function SprintSetupMarker() {
  const location = useLocation();
  return <p data-testid="sprint-setup-marker">{location.search}</p>;
}

describe("HomePage daily challenge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(ACTIVE_USER_KEY, "u1");

    mocks.userRepository.list.mockResolvedValue([
      { id: "u1", name: "Лёва", role: "student", createdAt: "2026-03-01T08:00:00.000Z" }
    ]);

    mocks.sessionRepository.getDailyProgressSummary.mockResolvedValue({
      date: "2026-03-01",
      sessionsTotal: 0,
      classicCount: 0,
      timedCount: 0,
      reverseCount: 0,
      bestClassicDurationMs: null,
      bestTimedScore: null,
      bestReverseDurationMs: null,
      avgAccuracy: null
    });

    mocks.sessionRepository.getIndividualInsights.mockResolvedValue({
      streakDays: 0,
      currentWeekAvgScore: null,
      previousWeekAvgScore: null,
      recommendation: {
        modeId: "classic_plus",
        reason: "Тестовая рекомендация",
        confidence: 0.6
      }
    });

    mocks.dailyChallengeRepository.getOrCreateForToday.mockResolvedValue({
      challenge: {
        id: "u1:2026-03-01",
        userId: "u1",
        localDate: "2026-03-01",
        moduleId: "sprint_math",
        modeId: "sprint_add_sub",
        status: "pending",
        requiredAttempts: 1,
        title: "Challenge дня: Sprint Add/Sub",
        description: "Пройдите 1 сессию в режиме «Sprint Add/Sub».",
        createdAt: "2026-03-01T08:00:00.000Z",
        completedAt: null
      },
      attemptsCount: 0,
      remainingAttempts: 1,
      completed: false,
      launchPath: "/training/sprint-math?mode=sprint_add_sub",
      progressLabel: "0 / 1"
    });

    mocks.listUpcomingDailyChallengeModes.mockReturnValue([
      { localDate: "2026-03-01", modeId: "sprint_add_sub", modeTitle: "Sprint Add/Sub" },
      { localDate: "2026-03-02", modeId: "reaction_signal", modeTitle: "Reaction: Сигнал" },
      {
        localDate: "2026-03-03",
        modeId: "reaction_stroop",
        modeTitle: "Reaction: Цвет и слово"
      }
    ]);
  });

  it("renders daily challenge widget with explanation and opens target setup", async () => {
    const user = userEvent.setup();
    localStorage.setItem(ACTIVE_USER_KEY, "u1");

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ActiveUserProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/training/sprint-math" element={<SprintSetupMarker />} />
          </Routes>
        </ActiveUserProvider>
      </MemoryRouter>
    );

    const challengeWidget = await screen.findByTestId("home-daily-challenge");
    expect(challengeWidget).toBeInTheDocument();
    expect(screen.getByText("Challenge дня: Sprint Add/Sub")).toBeInTheDocument();
    expect(
      challengeWidget.querySelector(".challenge-progress-text")?.textContent
    ).toBe("0 / 1");
    expect(screen.getByText("В процессе")).toBeInTheDocument();

    await user.click(screen.getByTestId("home-daily-challenge-start"));
    expect(await screen.findByTestId("sprint-setup-marker")).toHaveTextContent(
      "?mode=sprint_add_sub"
    );
  });
});

