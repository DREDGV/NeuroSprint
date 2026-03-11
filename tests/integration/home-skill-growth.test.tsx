import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { HomePage } from "../../src/pages/HomePage";
import { ACTIVE_USER_KEY } from "../../src/shared/constants/storage";
import type { Session, TrainingModeId, TrainingModuleId } from "../../src/shared/types/domain";

const mocks = vi.hoisted(() => ({
  sessionRepository: {
    getDailyProgressSummary: vi.fn(),
    getIndividualInsights: vi.fn(),
    listByUser: vi.fn()
  },
  dailyChallengeRepository: {
    getOrCreateForToday: vi.fn()
  },
  dailyTrainingRepository: {
    getOrCreateForToday: vi.fn()
  },
  levelRepository: {
    getOrCreateUserLevel: vi.fn(),
    getRecentXPLogs: vi.fn()
  },
  resolveAdaptiveDailyChallengeModeId: vi.fn(),
  userRepository: {
    list: vi.fn()
  }
}));

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: mocks.sessionRepository
}));

vi.mock("../../src/entities/challenge/dailyChallengeRepository", () => ({
  dailyChallengeRepository: mocks.dailyChallengeRepository,
  resolveAdaptiveDailyChallengeModeId: mocks.resolveAdaptiveDailyChallengeModeId
}));

vi.mock("../../src/entities/training/dailyTrainingRepository", () => ({
  dailyTrainingRepository: mocks.dailyTrainingRepository
}));

vi.mock("../../src/entities/level/levelRepository", () => ({
  levelRepository: mocks.levelRepository
}));

vi.mock("../../src/entities/user/userRepository", () => ({
  userRepository: mocks.userRepository
}));

vi.mock("../../src/widgets/DailyTrainingWidget", () => ({
  DailyTrainingWidget: () => <div data-testid="daily-training-widget" />
}));

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

describe("HomePage skill system", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(ACTIVE_USER_KEY, "u1");

    mocks.userRepository.list.mockResolvedValue([
      { id: "u1", name: "Григорий", role: "student", createdAt: "2026-03-01T08:00:00.000Z" }
    ]);

    mocks.sessionRepository.getDailyProgressSummary.mockResolvedValue({
      date: "2026-03-01",
      sessionsTotal: 1,
      classicCount: 0,
      timedCount: 0,
      reverseCount: 0,
      bestClassicDurationMs: null,
      bestTimedScore: null,
      bestReverseDurationMs: null,
      avgAccuracy: null
    });

    mocks.sessionRepository.getIndividualInsights.mockResolvedValue({
      streakDays: 2,
      currentWeekAvgScore: null,
      previousWeekAvgScore: null,
      recommendation: null
    });

    mocks.dailyChallengeRepository.getOrCreateForToday.mockResolvedValue(null);
    mocks.dailyTrainingRepository.getOrCreateForToday.mockResolvedValue(null);
    mocks.levelRepository.getOrCreateUserLevel.mockResolvedValue(null);
    mocks.levelRepository.getRecentXPLogs.mockResolvedValue([]);
    mocks.resolveAdaptiveDailyChallengeModeId.mockReturnValue(null);
  });

  it("shows the skill system block with a direct link to the skills tab", async () => {
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
      <MemoryRouter>
        <ActiveUserProvider>
          <HomePage />
        </ActiveUserProvider>
      </MemoryRouter>
    );

    const growth = await screen.findByTestId("home-skill-growth");
    expect(growth).toHaveTextContent("\u0421\u0438\u0441\u0442\u0435\u043c\u0430 \u043d\u0430\u0432\u044b\u043a\u043e\u0432 \u0443\u0436\u0435 \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442");
    expect(screen.getByTestId("home-skill-growth-status")).toHaveTextContent("\u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u0444\u043e\u043a\u0443\u0441");
    expect(screen.getByTestId("home-skill-growth-mini-grid")).toBeInTheDocument();
    expect(screen.getByTestId("home-skill-axis-attention")).toHaveTextContent("\u0412\u043d\u0438\u043c\u0430\u043d\u0438\u0435");
    expect(screen.getByTestId("home-skill-axis-reaction")).toHaveTextContent("\u0420\u043e\u0441\u0442");
    expect(screen.getByTestId("home-skill-growth-stats")).toHaveAttribute("href", "/stats#skills");
  });
});
