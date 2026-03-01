import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { ACTIVE_USER_KEY } from "../../src/shared/constants/storage";

const mocks = vi.hoisted(() => ({
  sessionRepository: {
    getDailyProgressSummary: vi.fn(),
    getIndividualInsights: vi.fn()
  },
  trainingRepository: {
    recommendModeForToday: vi.fn()
  },
  userRepository: {
    list: vi.fn()
  }
}));

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: mocks.sessionRepository
}));

vi.mock("../../src/entities/training/trainingRepository", () => ({
  trainingRepository: mocks.trainingRepository
}));

vi.mock("../../src/entities/user/userRepository", () => ({
  userRepository: mocks.userRepository
}));

import { PreSessionPage } from "../../src/pages/PreSessionPage";

function ReactionMarker() {
  const location = useLocation();
  return <p data-testid="reaction-setup-marker">{location.search}</p>;
}

describe("PreSessionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(ACTIVE_USER_KEY, "u1");

    mocks.userRepository.list.mockResolvedValue([
      { id: "u1", name: "Лёва", role: "student", createdAt: "2026-02-25T12:00:00.000Z" }
    ]);
    mocks.sessionRepository.getDailyProgressSummary.mockResolvedValue({
      date: "2026-02-25",
      sessionsTotal: 2,
      classicCount: 1,
      timedCount: 1,
      reverseCount: 0,
      bestClassicDurationMs: 12_000,
      bestTimedScore: 25,
      bestReverseDurationMs: null,
      avgAccuracy: 0.9
    });
    mocks.trainingRepository.recommendModeForToday.mockResolvedValue({
      modeId: "classic_plus",
      reason: "Тестовая рекомендация",
      confidence: 0.75
    });
    mocks.sessionRepository.getIndividualInsights.mockResolvedValue({
      streakDays: 4,
      currentWeekAvgScore: 22,
      previousWeekAvgScore: 18,
      recommendation: {
        modeId: "timed_plus",
        reason: "Тест",
        confidence: 0.7
      }
    });
  });

  it("keeps sprint module flow and opens sprint setup", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/training/pre-session?module=sprint_math"]}>
        <ActiveUserProvider>
          <Routes>
            <Route path="/training/pre-session" element={<PreSessionPage />} />
            <Route
              path="/training/sprint-math"
              element={<p data-testid="sprint-setup-marker">Sprint setup</p>}
            />
            <Route
              path="/training/schulte"
              element={<p data-testid="schulte-setup-marker">Schulte setup</p>}
            />
            <Route path="/training/reaction" element={<ReactionMarker />} />
          </Routes>
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("pre-session-page")).toBeInTheDocument();
    expect(screen.getByTestId("pre-session-motivation")).toBeInTheDocument();
    expect(screen.getByTestId("pre-session-mode-sprint_add_sub")).toBeInTheDocument();
    expect(screen.queryByTestId("pre-session-mode-classic_plus")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("pre-session-start-btn"));
    expect(await screen.findByTestId("sprint-setup-marker")).toBeInTheDocument();
    expect(screen.queryByTestId("schulte-setup-marker")).not.toBeInTheDocument();
  });

  it("supports explicit mode in query", async () => {
    render(
      <MemoryRouter initialEntries={["/training/pre-session?mode=timed_plus"]}>
        <ActiveUserProvider>
          <Routes>
            <Route path="/training/pre-session" element={<PreSessionPage />} />
          </Routes>
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("pre-session-page")).toBeInTheDocument();
    expect(screen.getByTestId("pre-session-mode-timed_plus")).toHaveClass("is-active");
  });

  it("supports reaction module flow and opens reaction mode route", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/training/pre-session?module=reaction"]}>
        <ActiveUserProvider>
          <Routes>
            <Route path="/training/pre-session" element={<PreSessionPage />} />
            <Route path="/training/reaction" element={<ReactionMarker />} />
          </Routes>
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("pre-session-page")).toBeInTheDocument();
    expect(screen.getByTestId("pre-session-mode-reaction_signal")).toBeInTheDocument();
    expect(screen.queryByTestId("pre-session-mode-classic_plus")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("pre-session-mode-reaction_pair"));
    expect(screen.getByTestId("pre-session-reaction-mode-tip")).toHaveTextContent("пару");
    await user.click(screen.getByTestId("pre-session-start-btn"));
    expect(await screen.findByTestId("reaction-setup-marker")).toHaveTextContent(
      "?mode=reaction_pair"
    );
  });
});
