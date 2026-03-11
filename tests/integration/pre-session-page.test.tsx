import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { ACTIVE_USER_KEY } from "../../src/shared/constants/storage";

const mocks = vi.hoisted(() => ({
  sessionRepository: {
    getDailyProgressSummary: vi.fn(),
    getIndividualInsights: vi.fn(),
    listByUser: vi.fn()
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
import type { Session, TrainingModuleId, TrainingModeId } from "../../src/shared/types/domain";

function makeSession(
  id: string,
  moduleId: TrainingModuleId,
  modeId: TrainingModeId,
  timestamp: string,
  overrides: Partial<Session> = {}
): Session {
  const modeByModule: Record<TrainingModuleId, Session["mode"]> = {
    schulte: "classic",
    sprint_math: "sprint_math",
    reaction: "reaction",
    n_back: "n_back",
    memory_grid: "memory_grid",
    spatial_memory: "spatial_memory",
    decision_rush: "decision_rush",
    memory_match: "memory_match",
    pattern_recognition: "pattern_recognition"
  };

  return {
    id,
    userId: "u1",
    taskId: moduleId,
    moduleId,
    modeId,
    mode: modeByModule[moduleId],
    level: 1,
    presetId: "easy",
    adaptiveSource: "auto",
    timestamp,
    localDate: timestamp.slice(0, 10),
    durationMs: 45_000,
    score: 60,
    accuracy: 0.8,
    speed: 1,
    errors: 1,
    difficulty: {
      gridSize: 3,
      numbersCount: 9,
      mode: modeByModule[moduleId]
    },
    ...overrides
  };
}

function ReactionMarker() {
  const location = useLocation();
  return <p data-testid="reaction-setup-marker">{location.search}</p>;
}

function NBackMarker() {
  const location = useLocation();
  return <p data-testid="nback-setup-marker">{location.search}</p>;
}

function DecisionRushMarker() {
  const location = useLocation();
  return <p data-testid="decision-setup-marker">{location.search}</p>;
}

function SpatialMemoryMarker() {
  const location = useLocation();
  return <p data-testid="spatial-memory-setup-marker">{location.search}</p>;
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
    mocks.sessionRepository.listByUser.mockResolvedValue([]);
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
            <Route path="/training/nback" element={<NBackMarker />} />
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
            <Route path="/training/nback" element={<NBackMarker />} />
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

  it("supports nback module flow and opens nback mode route", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/training/pre-session?module=n_back"]}>
        <ActiveUserProvider>
          <Routes>
            <Route path="/training/pre-session" element={<PreSessionPage />} />
            <Route path="/training/nback" element={<NBackMarker />} />
          </Routes>
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("pre-session-page")).toBeInTheDocument();
    expect(screen.getByTestId("pre-session-mode-nback_1")).toBeInTheDocument();
    expect(screen.queryByTestId("pre-session-mode-classic_plus")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("pre-session-mode-nback_2"));
    await user.click(screen.getByTestId("pre-session-start-btn"));
    expect(await screen.findByTestId("nback-setup-marker")).toHaveTextContent(
      "?mode=nback_2"
    );
  });

  it("supports decision rush module flow and opens decision mode route", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/training/pre-session?module=decision_rush"]}>
        <ActiveUserProvider>
          <Routes>
            <Route path="/training/pre-session" element={<PreSessionPage />} />
            <Route path="/training/decision-rush" element={<DecisionRushMarker />} />
          </Routes>
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("pre-session-page")).toBeInTheDocument();
    expect(screen.getByTestId("pre-session-mode-decision_kids")).toBeInTheDocument();
    expect(screen.queryByTestId("pre-session-mode-classic_plus")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("pre-session-mode-decision_pro"));
    await user.click(screen.getByTestId("pre-session-start-btn"));
    expect(await screen.findByTestId("decision-setup-marker")).toHaveTextContent(
      "?mode=decision_pro"
    );
  });

  it("supports spatial memory module flow and opens spatial memory route", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/training/pre-session?module=spatial_memory"]}>
        <ActiveUserProvider>
          <Routes>
            <Route path="/training/pre-session" element={<PreSessionPage />} />
            <Route path="/training/spatial-memory" element={<SpatialMemoryMarker />} />
          </Routes>
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("pre-session-page")).toBeInTheDocument();
    expect(screen.getByTestId("pre-session-mode-spatial_memory_classic")).toBeInTheDocument();
    expect(screen.queryByTestId("pre-session-mode-classic_plus")).not.toBeInTheDocument();
    expect(screen.getByTestId("pre-session-reaction-mode-tip")).toHaveTextContent("форму поля");

    await user.click(screen.getByTestId("pre-session-start-btn"));
    expect(await screen.findByTestId("spatial-memory-setup-marker")).toHaveTextContent(
      "?mode=spatial_memory_classic"
    );
  });

  it("shows growth focus and uses it as the default start when there is no query filter", async () => {
    mocks.sessionRepository.listByUser.mockResolvedValue([
      makeSession("s1", "reaction", "reaction_signal", "2026-03-08T10:00:00.000Z", {
        score: 164,
        accuracy: 0.93,
        errors: 0
      }),
      makeSession("s2", "reaction", "reaction_pair", "2026-03-07T10:00:00.000Z", {
        score: 152,
        accuracy: 0.9,
        errors: 1
      })
    ]);

    render(
      <MemoryRouter initialEntries={["/training/pre-session"]}>
        <ActiveUserProvider>
          <Routes>
            <Route path="/training/pre-session" element={<PreSessionPage />} />
          </Routes>
        </ActiveUserProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("pre-session-growth-focus")).toHaveTextContent(
      "Сейчас стоит усилить память"
    );
    expect(screen.getByTestId("pre-session-mode-memory_match_classic")).toHaveClass("is-active");
    expect(screen.getByTestId("pre-session-use-growth-focus-btn")).toBeDisabled();
    expect(screen.getByTestId("pre-session-recommendation")).toBeInTheDocument();
  });
});
